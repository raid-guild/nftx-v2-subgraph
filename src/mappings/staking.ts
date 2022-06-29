import {
  PoolCreated as PoolCreatedEvent,
  PoolUpdated as PoolUpdatedEvent,
  NFTXLPStaking,
} from '../types/templates/NFTXLPStaking/NFTXLPStaking';
import {
  XTokenCreated as XTokenCreatedEvent,
  Withdraw as WithdrawEvent,
  Deposit as DepositEvent,
  NFTXInventoryStaking
} from '../types/NFTXInventoryStaking/NFTXInventoryStaking';
import { NFTXVaultFactoryUpgradeable as NFTXVaultFactory } from '../types/templates/NFTXLPStaking/NFTXVaultFactoryUpgradeable';
import { StakingTokenProvider } from '../types/templates/NFTXLPStaking/StakingTokenProvider';
import { getGlobal, getInventoryDeposit, getInventoryPool, getInventoryWithdrawal, getPool, getToken, getUser, getVault } from './helpers';
import { RewardDistributionTokenUpgradeable as RewardDistributionTokenTemplate } from '../types/templates';
import { Address, BigInt } from '@graphprotocol/graph-ts';

function newInventoryPool(
  stakingAddress: Address,
  xTokenAddress: Address,
  vaultId: BigInt
): void {
  let stakingInstance = NFTXInventoryStaking.bind(stakingAddress);
  let vaultFactoryAddress = stakingInstance.nftxVaultFactory();
  let vaultFactoryInstance = NFTXVaultFactory.bind(vaultFactoryAddress);
  let vaultAddress = vaultFactoryInstance.vault(vaultId);

  let pool = getInventoryPool(xTokenAddress);
  let vault = getVault(vaultAddress);
  vault.inventoryStakingPool = pool.id;
  vault.save();

  let rewardToken = getToken(vaultAddress);
  rewardToken.save();
  let dividendToken = getToken(xTokenAddress);
  dividendToken.save();
  let stakingToken = getToken(vaultAddress);
  stakingToken.save();

  pool.rewardToken = rewardToken.id;
  pool.stakingToken = stakingToken.id;
  pool.dividendToken = dividendToken.id;
  pool.vault = vaultAddress.toHexString();
  pool.save();
}

function newPool(
  stakingAddress: Address,
  poolAddress: Address,
  vaultId: BigInt,
  blockNumber: BigInt
): void {
  let stakingInstance = NFTXLPStaking.bind(stakingAddress);
  let vaultFactoryAddress = stakingInstance.nftxVaultFactory();
  let vaultFactoryInstance = NFTXVaultFactory.bind(vaultFactoryAddress);
  let vaultAddress = vaultFactoryInstance.vault(vaultId);

  let stakingTokenProviderAddress = stakingInstance.stakingTokenProvider();
  let stakingTokenProviderInstance = StakingTokenProvider.bind(
    stakingTokenProviderAddress,
  );
  let stakingTokenAddress =
    stakingTokenProviderInstance.stakingTokenForVaultToken(vaultAddress);

  let pool = getPool(poolAddress, blockNumber);
  let vault = getVault(vaultAddress);
  vault.lpStakingPool = pool.id;
  vault.save();

  let rewardToken = getToken(vaultAddress);
  rewardToken.save();
  let dividendToken = getToken(poolAddress);
  dividendToken.save();
  let stakingToken = getToken(stakingTokenAddress);
  stakingToken.save();

  pool.rewardToken = rewardToken.id;
  pool.stakingToken = stakingToken.id;
  pool.dividendToken = dividendToken.id;
  pool.vault = vaultAddress.toHexString();
  pool.save();

  RewardDistributionTokenTemplate.create(poolAddress);
}

export function handleWithdraw(event: WithdrawEvent): void {
  let global = getGlobal();
  let stakingAddress = changetype<Address>(global.inventoryStakingAddress);
  let stakingInstance = NFTXInventoryStaking.bind(stakingAddress);
  let xTokenAddress = stakingInstance.try_vaultXToken(event.params.vaultId);

  if (xTokenAddress.reverted) {
    return;
  }

  let user = getUser(event.params.sender);
  let inventoryWithdrawal = getInventoryWithdrawal(event.transaction.hash);

  inventoryWithdrawal.amount = event.params.baseTokenAmount;
  inventoryWithdrawal.xToken = xTokenAddress.value;

  inventoryWithdrawal.save();
  user.save();
  
}

export function handleDeposit(event: DepositEvent): void {
  let global = getGlobal();
  let stakingAddress = changetype<Address>(global.inventoryStakingAddress);
  let stakingInstance = NFTXInventoryStaking.bind(stakingAddress);
  let xTokenAddress = stakingInstance.try_vaultXToken(event.params.vaultId);

  if (xTokenAddress.reverted) {
    return;
  }

  let user = getUser(event.params.sender);
  let inventoryDeposit = getInventoryDeposit(event.transaction.hash);

  inventoryDeposit.amount = event.params.baseTokenAmount;
  inventoryDeposit.xToken = xTokenAddress.value;

  inventoryDeposit.save();
  user.save();
}

export function handleXTokenCreated(event: XTokenCreatedEvent): void {
  newInventoryPool(event.address, event.params.xToken, event.params.vaultId)
}

export function handlePoolCreated(event: PoolCreatedEvent): void {
  newPool(event.address, event.params.pool, event.params.vaultId, event.block.number);
}

export function handlePoolUpdated(event: PoolUpdatedEvent): void {
  newPool(event.address, event.params.pool, event.params.vaultId, event.block.number);
}
