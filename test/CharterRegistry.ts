const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CharterRegistry", function () {
  async function deployFixture() {
    const [deployer, charterUser, executionRecorder, stranger, service] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("CharterRegistry");
    const registry = await Factory.deploy();
    await registry.waitForDeployment();

    await registry.setAuthorizedExecutionRecorder(executionRecorder.address, true);

    return { registry, deployer, charterUser, executionRecorder, stranger, service };
  }

  const NULLIFIER = ethers.keccak256(ethers.toUtf8Bytes("world-nullifier-test-1"));
  const DOMAIN = "inference";
  const BUDGET = ethers.parseUnits("1", 8);
  const ONE_DAY = 24 * 60 * 60;

  it("deploys correctly", async function () {
    const { registry, deployer } = await deployFixture();

    expect(await registry.owner()).to.equal(deployer.address);
    expect(await registry.nextCharterId()).to.equal(1n);
    expect(await registry.authorizedMinters(deployer.address)).to.equal(true);
  });

  it("allows an authorized minter to create a Charter", async function () {
    const { registry, charterUser } = await deployFixture();

    await expect(
      registry.mintCharter(
        charterUser.address,
        NULLIFIER,
        DOMAIN,
        BUDGET,
        ONE_DAY,
        1,
        "hcs://metadata/1"
      )
    )
      .to.emit(registry, "CharterCreated")
      .withArgs(1, charterUser.address, NULLIFIER, DOMAIN, BUDGET, 1, (value: bigint) => value > 0n);

    const charter = await registry.getCharter(1);

    expect(charter.owner).to.equal(charterUser.address);
    expect(charter.domain).to.equal(DOMAIN);
    expect(charter.budgetTinybars).to.equal(BUDGET);
    expect(charter.usedTinybars).to.equal(0n);
    expect(charter.active).to.equal(true);
  });

  it("rejects unauthorized minting", async function () {
    const { registry, stranger, charterUser } = await deployFixture();

    await expect(
      registry.connect(stranger).mintCharter(
        charterUser.address,
        NULLIFIER,
        DOMAIN,
        BUDGET,
        ONE_DAY,
        1,
        ""
      )
    ).to.be.revertedWithCustomError(registry, "NotAuthorizedMinter");
  });

  it("prevents duplicate active charter for the same user/domain", async function () {
    const { registry, charterUser } = await deployFixture();

    await registry.mintCharter(
      charterUser.address,
      NULLIFIER,
      DOMAIN,
      BUDGET,
      ONE_DAY,
      1,
      ""
    );

    await expect(
      registry.mintCharter(
        charterUser.address,
        NULLIFIER,
        DOMAIN,
        BUDGET,
        ONE_DAY,
        1,
        ""
      )
    ).to.be.revertedWithCustomError(registry, "AlreadyHasActiveCharter");
  });

  it("records an execution", async function () {
    const { registry, charterUser, executionRecorder, service } = await deployFixture();

    await registry.mintCharter(
      charterUser.address,
      NULLIFIER,
      DOMAIN,
      BUDGET,
      ONE_DAY,
      1,
      ""
    );

    const amount = ethers.parseUnits("0.25", 8);
    const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment-1"));

    await expect(
      registry.connect(executionRecorder).recordExecution(1, service.address, amount, paymentHash)
    )
      .to.emit(registry, "CharterExecution")
      .withArgs(1, service.address, amount, DOMAIN, paymentHash);

    expect(await registry.getRemainingBudget(1)).to.equal(BUDGET - amount);
  });

  it("rejects execution exceeding budget", async function () {
    const { registry, charterUser, executionRecorder, service } = await deployFixture();

    await registry.mintCharter(
      charterUser.address,
      NULLIFIER,
      DOMAIN,
      BUDGET,
      ONE_DAY,
      1,
      ""
    );

    const tooMuch = BUDGET + 1n;
    const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment-too-much"));

    await expect(
      registry.connect(executionRecorder).recordExecution(1, service.address, tooMuch, paymentHash)
    ).to.be.revertedWithCustomError(registry, "BudgetExceeded");
  });

  it("rejects unauthorized execution recording", async function () {
    const { registry, charterUser, stranger, service } = await deployFixture();

    await registry.mintCharter(
      charterUser.address,
      NULLIFIER,
      DOMAIN,
      BUDGET,
      ONE_DAY,
      1,
      ""
    );

    await expect(
      registry.connect(stranger).recordExecution(1, service.address, 1n, ethers.ZeroHash)
    ).to.be.revertedWithCustomError(registry, "NotAuthorizedExecutionRecorder");
  });

  it("allows owner to revoke a Charter", async function () {
    const { registry, charterUser } = await deployFixture();

    await registry.mintCharter(
      charterUser.address,
      NULLIFIER,
      DOMAIN,
      BUDGET,
      ONE_DAY,
      1,
      ""
    );

    await expect(registry.connect(charterUser).revokeCharter(1)).to.emit(registry, "CharterRevoked").withArgs(1, charterUser.address);

    const charter = await registry.getCharter(1);
    expect(charter.active).to.equal(false);
  });

  it("rejects invalid budget", async function () {
    const { registry, charterUser } = await deployFixture();

    await expect(
      registry.mintCharter(
        charterUser.address,
        NULLIFIER,
        DOMAIN,
        0n,
        ONE_DAY,
        1,
        ""
      )
    ).to.be.revertedWithCustomError(registry, "InvalidBudget");
  });

  it("rejects invalid duration", async function () {
    const { registry, charterUser } = await deployFixture();

    await expect(
      registry.mintCharter(
        charterUser.address,
        NULLIFIER,
        DOMAIN,
        BUDGET,
        0,
        1,
        ""
      )
    ).to.be.revertedWithCustomError(registry, "InvalidDuration");
  });

  it("rejects invalid tier", async function () {
    const { registry, charterUser } = await deployFixture();

    await expect(
      registry.mintCharter(
        charterUser.address,
        NULLIFIER,
        DOMAIN,
        BUDGET,
        ONE_DAY,
        2,
        ""
      )
    ).to.be.revertedWithCustomError(registry, "InvalidTier");
  });
});
