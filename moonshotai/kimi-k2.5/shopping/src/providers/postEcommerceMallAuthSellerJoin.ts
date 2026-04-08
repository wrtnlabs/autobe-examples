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

export async function postEcommerceMallAuthSellerJoin(props: {
  ip: string;
  body: IEcommerceMallSeller.IJoin;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  // Check email uniqueness
  const existing = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Generate UUIDs
  const sellerId: string & tags.Format<"uuid"> = v4();
  const registrationId: string & tags.Format<"uuid"> = v4();
  const sessionId: string & tags.Format<"uuid"> = v4();
  // Get current timestamp
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Calculate token expiration
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  // Create seller record
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.create({
    data: {
      id: sellerId,
      email: props.body.email,
      password_hash: hashedPassword,
      approval_status: "pending",
      created_at: new Date(now),
      updated_at: new Date(now),
      deleted_at: null,
    },
    ...EcommerceMallSellerTransformer.select(),
  });
  // Create registration record
  await MyGlobal.prisma.ecommerce_mall_seller_registrations.create({
    data: {
      id: registrationId,
      seller_id: sellerId,
      reviewer_id: null,
      status: "pending",
      rejection_reason: null,
      created_at: new Date(now),
      updated_at: new Date(now),
      reviewed_at: null,
    },
  });
  // Create session record
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_seller_id: sellerId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(now),
      expired_at: new Date(accessExpires),
    },
  });
  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: sellerId,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "seller",
        id: sellerId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // Transform seller to DTO
  const sellerDto = await EcommerceMallSellerTransformer.transform(seller);
  // Return authorized seller with token
  return {
    id: sellerDto.id,
    email: sellerDto.email,
    approvalStatus: sellerDto.approvalStatus,
    createdAt: sellerDto.createdAt,
    updatedAt: sellerDto.updatedAt,
    deletedAt: sellerDto.deletedAt,
    profile: sellerDto.profile,
    token,
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
// export async function postEcommerceMallAuthSellerJoin(props: {
//   ip: string;
//   body: IEcommerceMallSeller.IJoin;
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