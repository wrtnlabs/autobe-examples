import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthSellerJoin(props: {
  ip: string;
  body: IEcommerceMallSeller.IJoin;
}): Promise<IEcommerceMallSeller.IAuthorized> {
  // Check email uniqueness (active accounts only)
  const existing = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (existing !== undefined) {
    throw new HttpException("Email already registered", 409);
  }
  // Generate unique IDs
  const sellerId: string & tags.Format<"uuid"> = v4();
  const verificationId: string & tags.Format<"uuid"> = v4();
  const sessionId: string & tags.Format<"uuid"> = v4();
  // Generate verification token
  const verificationToken: string & tags.Format<"uuid"> = v4();
  const verificationTokenHash: string = verificationToken;
  // Calculate timestamps
  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const expiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Create seller record
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.create({
    data: {
      id: sellerId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.display_name,
      approval_status: "pending",
      is_suspended: false,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Create email verification record
  await MyGlobal.prisma.ecommerce_mall_seller_email_verifications.create({
    data: {
      id: verificationId,
      ecommerce_mall_seller_id: sellerId,
      token: verificationToken,
      token_hash: verificationTokenHash,
      email: props.body.email,
      verified: false,
      verified_at: null,
      expires_at: new Date(expiresAt),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Create session record with JWT tokens
  const accessJwt: string = jwt.sign(
    {
      type: "seller",
      id: sellerId,
      session_id: sessionId,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshJwt: string = jwt.sign(
    {
      type: "seller",
      id: sellerId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const session = await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_seller_id: sellerId,
      access_token: accessJwt,
      refresh_token: refreshJwt,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      expired_at: new Date(accessExpires),
    },
  });
  // Build IAuthorized response
  const authorizedResponse: IEcommerceMallSeller.IAuthorized = {
    id: seller.id,
    email: seller.email,
    display_name: seller.display_name,
    approval_status: seller.approval_status as
      | "pending"
      | "approved"
      | "rejected",
    rejection_reason: seller.rejection_reason,
    is_suspended: seller.is_suspended,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at:
      seller.deleted_at !== null ? toISOStringSafe(seller.deleted_at) : null,
    token: {
      access: accessJwt,
      refresh: refreshJwt,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
  return authorizedResponse;
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
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthSellerJoin(props: {
//   ip: string;
//   body: IEcommerceMallSeller.IJoin;
// }): Promise<IEcommerceMallSeller.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------