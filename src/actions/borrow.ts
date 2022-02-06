import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { TxnResponse } from "../helpers/jet/JetTypes";
import { Amount, JetReserve, JetUser } from "../jet";
import { TxResponse } from "./types";

// Lend Actions
export const deriveAssociatedTokenAccount = async (tokenMint: PublicKey, userPubkey: PublicKey) => {
  const associatedTokenAccount: PublicKey = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    tokenMint,
    userPubkey
  );
  if (!associatedTokenAccount)
    console.log("Associated Token Account could not be located");
  return associatedTokenAccount;
}

export const getNFTAssociatedMetadata = async (
  connection: Connection,
  metadataPubKey: PublicKey
) => {
  const data = await connection.getAccountInfo(metadataPubKey);
  if (!data)
    return;
  return data;
}

export const depositNFT = async (
  connection: Connection,
  jetUser: JetUser,
  metadataPubKey: PublicKey,
): Promise<TxResponse> => {
  const associatedMetadata = await getNFTAssociatedMetadata(connection, metadataPubKey);
  if (!associatedMetadata) {
    console.error(`Could not find NFT metadata account ${metadataPubKey}`);
    return [TxnResponse.Failed, []]
  }
  const tokenMetadata = new Metadata(metadataPubKey, associatedMetadata);
  const tokenMint = new PublicKey(tokenMetadata.data.mint);
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(tokenMint, jetUser.address);
  if (!associatedTokenAccount) {
    console.error(`Could not find the associated token account: ${associatedTokenAccount}`)
    return [TxnResponse.Failed, []];
  }
  return await jetUser.depositNFT(
    associatedTokenAccount,
    tokenMint,
    new PublicKey(tokenMetadata.data.updateAuthority)
  )
}

export const withdrawNFT = async (
  connection: Connection,
  jetUser: JetUser,
  metadataPubKey: PublicKey,
  reserves: JetReserve[]
): Promise<TxResponse> => {
  const associatedMetadata = await getNFTAssociatedMetadata(connection, metadataPubKey);
  if (!associatedMetadata) {
    console.error(`Could not find NFT metadata account ${metadataPubKey}`);
    return [TxnResponse.Failed, []]
  }
  const tokenMetadata = new Metadata(metadataPubKey, associatedMetadata);
  const tokenMint = new PublicKey(tokenMetadata.data.mint);
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(tokenMint, jetUser.address);
  if (!associatedTokenAccount) {
    console.error(`Could not find the associated token account: ${associatedTokenAccount}`)
    return [TxnResponse.Failed, []];
  }
  return await jetUser.withdrawNFT(
    associatedTokenAccount,
    tokenMint,
    new PublicKey(tokenMetadata.data.updateAuthority),
    reserves
  );
}

export const borrow = async (
  jetUser: JetUser,
  borrowAmount: number,
  borrowTokenMint: PublicKey,
  borrowReserves: JetReserve[],
): Promise<TxResponse> => {
  const amount = Amount.tokens(borrowAmount);
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(borrowTokenMint, jetUser.address);
  const borrowReserve: JetReserve = borrowReserves.filter((reserve: JetReserve) => reserve.data.tokenMint.equals(borrowTokenMint))[0];

  if (!associatedTokenAccount) {
    console.error(`Ata could not be found`);
    return [TxnResponse.Failed, []]
  }
  const borrow = await jetUser.borrow(
    borrowReserve,
    associatedTokenAccount,
    amount,
  );
  return borrow;
}

export const repay = async (
  jetUser: JetUser,
  repayAmount: number,
  repayTokenMint: PublicKey,
  repayReserves: JetReserve[]
): Promise<TxResponse> => {
  const amount = Amount.tokens(repayAmount); // basically just pay back double the loan for now
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(repayTokenMint, jetUser.address);
  const repayReserve: JetReserve = repayReserves.filter((reserve: JetReserve) => reserve.data.tokenMint.equals(repayTokenMint))[0];
  if (!associatedTokenAccount) {
    console.error(`Ata could not be found`);
    return [TxnResponse.Failed, []];

  }
  return await jetUser.repay(repayReserve, associatedTokenAccount, amount)
}