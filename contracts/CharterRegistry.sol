// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CharterRegistry {
    struct Charter {
        address owner;
        bytes32 worldNullifier;
        string domain;
        uint256 budgetTinybars;
        uint256 usedTinybars;
        uint64 expiresAt;
        uint8 tier;
        bool active;
        string metadataUri;
    }

    mapping(uint256 => Charter) private charters;
    mapping(bytes32 => bool) public nullifierDomainUsed;
    mapping(address => bool) public authorizedMinters;
    mapping(address => bool) public authorizedExecutionRecorders;

    uint256 public nextCharterId = 1;
    address public owner;
    bytes public hcsLifecycleTopic;
    bytes public hcsExecutionTopic;

    event CharterCreated(
        uint256 indexed charterId,
        address indexed owner,
        bytes32 indexed worldNullifier,
        string domain,
        uint256 budgetTinybars,
        uint8 tier,
        uint64 expiresAt
    );

    event CharterRevoked(uint256 indexed charterId, address indexed owner);

    event CharterExecution(
        uint256 indexed charterId,
        address indexed serviceAddress,
        uint256 amountTinybars,
        string domain,
        bytes32 paymentTxHash
    );

    event AuthorizedMinterUpdated(address indexed account, bool authorized);
    event AuthorizedExecutionRecorderUpdated(address indexed account, bool authorized);
    event HcsTopicsUpdated(bytes lifecycleTopic, bytes executionTopic);

    error NotOwner();
    error NotAuthorizedMinter();
    error NotAuthorizedExecutionRecorder();
    error InvalidOwner();
    error InvalidNullifier();
    error EmptyDomain();
    error InvalidBudget();
    error InvalidDuration();
    error InvalidTier();
    error CharterDoesNotExist();
    error CharterInactive();
    error CharterExpired();
    error BudgetExceeded();
    error AlreadyHasActiveCharter();
    error AlreadyRevoked();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyMinter() {
        if (!authorizedMinters[msg.sender]) revert NotAuthorizedMinter();
        _;
    }

    modifier onlyExecutionRecorder() {
        if (!authorizedExecutionRecorders[msg.sender]) revert NotAuthorizedExecutionRecorder();
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedMinters[msg.sender] = true;
        authorizedExecutionRecorders[msg.sender] = true;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidOwner();
        owner = newOwner;
    }

    function setAuthorizedMinter(address account, bool authorized) external onlyOwner {
        if (account == address(0)) revert InvalidOwner();
        authorizedMinters[account] = authorized;
        emit AuthorizedMinterUpdated(account, authorized);
    }

    function setAuthorizedExecutionRecorder(address account, bool authorized) external onlyOwner {
        if (account == address(0)) revert InvalidOwner();
        authorizedExecutionRecorders[account] = authorized;
        emit AuthorizedExecutionRecorderUpdated(account, authorized);
    }

    function setHcsTopics(bytes calldata lifecycleTopic, bytes calldata executionTopic) external onlyOwner {
        hcsLifecycleTopic = lifecycleTopic;
        hcsExecutionTopic = executionTopic;
        emit HcsTopicsUpdated(lifecycleTopic, executionTopic);
    }

    function mintCharter(
        address charterOwner,
        bytes32 worldNullifier,
        string calldata domain,
        uint256 budgetTinybars,
        uint256 durationSeconds,
        uint8 tier,
        string calldata metadataUri
    ) external onlyMinter returns (uint256 charterId) {
        if (charterOwner == address(0)) revert InvalidOwner();
        if (worldNullifier == bytes32(0)) revert InvalidNullifier();
        if (bytes(domain).length == 0) revert EmptyDomain();
        if (budgetTinybars == 0) revert InvalidBudget();
        if (durationSeconds == 0) revert InvalidDuration();
        if (tier > 1) revert InvalidTier();

        bytes32 guard = keccak256(abi.encode(worldNullifier, domain));
        if (nullifierDomainUsed[guard]) revert AlreadyHasActiveCharter();

        uint256 expiration = block.timestamp + durationSeconds;
        require(expiration <= type(uint64).max, "Expiration overflow");

        charterId = nextCharterId;
        nextCharterId += 1;

        charters[charterId] = Charter({
            owner: charterOwner,
            worldNullifier: worldNullifier,
            domain: domain,
            budgetTinybars: budgetTinybars,
            usedTinybars: 0,
            expiresAt: uint64(expiration),
            tier: tier,
            active: true,
            metadataUri: metadataUri
        });

        nullifierDomainUsed[guard] = true;

        emit CharterCreated(charterId, charterOwner, worldNullifier, domain, budgetTinybars, tier, uint64(expiration));
    }

    function recordExecution(
        uint256 charterId,
        address serviceAddress,
        uint256 amountTinybars,
        bytes32 paymentTxHash
    ) external onlyExecutionRecorder {
        Charter storage charter = charters[charterId];
        if (charter.owner == address(0)) revert CharterDoesNotExist();
        if (!charter.active) revert CharterInactive();
        if (block.timestamp >= charter.expiresAt) revert CharterExpired();
        if (amountTinybars > charter.budgetTinybars - charter.usedTinybars) revert BudgetExceeded();

        charter.usedTinybars += amountTinybars;
        emit CharterExecution(charterId, serviceAddress, amountTinybars, charter.domain, paymentTxHash);
    }

    function revokeCharter(uint256 charterId) external {
        Charter storage charter = charters[charterId];
        if (charter.owner == address(0)) revert CharterDoesNotExist();
        if (msg.sender != charter.owner && msg.sender != owner) revert NotOwner();
        if (!charter.active) revert AlreadyRevoked();

        charter.active = false;
        bytes32 guard = keccak256(abi.encode(charter.worldNullifier, charter.domain));
        nullifierDomainUsed[guard] = false;

        emit CharterRevoked(charterId, charter.owner);
    }

    function getCharter(uint256 charterId) external view returns (Charter memory) {
        Charter memory charter = charters[charterId];
        if (charter.owner == address(0)) revert CharterDoesNotExist();
        return charter;
    }

    function getRemainingBudget(uint256 charterId) public view returns (uint256) {
        Charter memory charter = charters[charterId];
        if (charter.owner == address(0)) revert CharterDoesNotExist();
        if (charter.usedTinybars >= charter.budgetTinybars) return 0;
        return charter.budgetTinybars - charter.usedTinybars;
    }

    function isCharterExecutable(uint256 charterId, uint256 requestedAmountTinybars) external view returns (bool) {
        Charter memory charter = charters[charterId];
        if (charter.owner == address(0)) return false;
        if (!charter.active) return false;
        if (block.timestamp >= charter.expiresAt) return false;
        if (requestedAmountTinybars > charter.budgetTinybars - charter.usedTinybars) return false;
        return true;
    }

    function charterExists(uint256 charterId) external view returns (bool) {
        return charters[charterId].owner != address(0);
    }
}
