import {
  CharterCreated,
  CharterRevoked,
  CharterExecution,
} from "../generated/CharterRegistry/CharterRegistry";
import { Charter, Execution, CharterStats } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

function getOrCreateStats(): CharterStats {
  let stats = CharterStats.load("global");
  if (!stats) {
    stats = new CharterStats("global");
    stats.totalCharters = 0;
    stats.activeCharters = 0;
    stats.totalExecutions = 0;
    stats.totalVolumeTinybars = BigInt.zero();
    stats.totalVolumeHbar = BigInt.zero();
  }
  return stats;
}

export function handleCharterCreated(event: CharterCreated): void {
  let charter = new Charter(event.params.charterId.toString());

  charter.owner = event.params.owner;
  charter.worldNullifier = event.params.worldNullifier;
  charter.domain = event.params.domain;
  charter.budgetTinybars = event.params.budgetTinybars;
  charter.usedTinybars = BigInt.zero();
  charter.remainingTinybars = event.params.budgetTinybars;
  charter.budgetHbar = event.params.budgetTinybars;
  charter.usedHbar = BigInt.zero();
  charter.remainingHbar = event.params.budgetTinybars;
  charter.expiresAt = event.params.expiresAt;
  charter.tier = event.params.tier;
  charter.active = true;
  charter.createdAt = event.block.timestamp;
  charter.createdTxHash = event.transaction.hash;
  charter.reputation = 0;
  charter.executionCount = 0;

  charter.save();

  let stats = getOrCreateStats();
  stats.totalCharters += 1;
  stats.activeCharters += 1;
  stats.save();
}

export function handleCharterRevoked(event: CharterRevoked): void {
  let charter = Charter.load(event.params.charterId.toString());
  if (!charter) return;

  charter.active = false;
  charter.save();

  let stats = getOrCreateStats();
  stats.activeCharters -= 1;
  stats.save();
}

export function handleCharterExecution(event: CharterExecution): void {
  let charter = Charter.load(event.params.charterId.toString());
  if (!charter) return;

  charter.usedTinybars = charter.usedTinybars.plus(event.params.amountTinybars);
  charter.remainingTinybars = charter.budgetTinybars.minus(charter.usedTinybars);
  charter.usedHbar = charter.usedTinybars;
  charter.remainingHbar = charter.budgetHbar.minus(charter.usedHbar);
  charter.executionCount += 1;

  let rawRep = charter.executionCount * 10;
  charter.reputation = rawRep > 100 ? 100 : rawRep;
  charter.save();

  let execId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let execution = new Execution(execId);
  execution.charter = charter.id;
  execution.serviceAddress = event.params.serviceAddress;
  execution.amountTinybars = event.params.amountTinybars;
  execution.amountHbar = event.params.amountTinybars;
  execution.domain = event.params.domain;
  execution.timestamp = event.block.timestamp;
  execution.txHash = event.transaction.hash;
  execution.paymentTxHash = event.params.paymentTxHash;
  execution.save();

  let stats = getOrCreateStats();
  stats.totalExecutions += 1;
  stats.totalVolumeTinybars = stats.totalVolumeTinybars.plus(event.params.amountTinybars);
  stats.totalVolumeHbar = stats.totalVolumeTinybars;
  stats.save();
}
