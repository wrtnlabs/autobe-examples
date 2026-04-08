import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallSellerTransformer } from "../transformers/EcommerceMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthSellerRefresh(props: {
  body: IEcommerceMallSeller.IRefresh;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  // Step 1: Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Step 2: Validate token type
  if (decoded.type !== "seller") {
    throw new HttpException("Invalid token type", 403);
  }
  // Step 3: Validate session exists and belongs to seller
  const session =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.findFirst({
      where: {
        id: decoded.session_id,
        ecommerce_mall_seller_id: decoded.id,
      },
    });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Step 4: Get seller and verify not deleted
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: decoded.id },
      ...EcommerceMallSellerTransformer.select(),
    },
  );
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Step 5: Calculate expiration timestamps
  const nowTimestamp = Date.now();
  const accessExpiresTimestamp = nowTimestamp + 60 * 60 * 1000;
  const refreshExpiresTimestamp = nowTimestamp + 7 * 24 * 60 * 60 * 1000;
  const nowISO = new Date(nowTimestamp).toISOString();
  const accessExpiresISO = new Date(accessExpiresTimestamp).toISOString();
  const refreshExpiresISO = new Date(refreshExpiresTimestamp).toISOString();
  // Step 6: Generate new tokens with SAME session_id
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Step 7: Update session expiration
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresISO },
  });
  // Step 8: Transform seller data
  const sellerData = await EcommerceMallSellerTransformer.transform(seller);
  // Step 9: Return authorized response
  return {
    id: sellerData.id,
    email: sellerData.email,
    approvalStatus: sellerData.approvalStatus,
    createdAt: sellerData.createdAt,
    updatedAt: sellerData.updatedAt,
    deletedAt: sellerData.deletedAt,
    profile: sellerData,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresISO,
      refreshable_until: refreshExpiresISO,
    },
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthSellerRefresh(props: {
//   body: IEcommerceMallSeller.IRefresh;
// }): Promise<IEcommerceMallSeller.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     approvalStatus: ...,
//     createdAt: ...,
//     updatedAt: ...,
//     deletedAt: ...,
//     profile: await EcommerceMallSellerTransformer.transform(...),
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------