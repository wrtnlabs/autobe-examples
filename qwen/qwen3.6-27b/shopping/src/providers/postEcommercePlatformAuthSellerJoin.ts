import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformSellerTransformer } from "../transformers/EcommercePlatformSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformAuthSellerJoin(props: {
  ip: string;
  body: IEcommercePlatformSeller.IJoin;
}): Promise<IEcommercePlatformSeller.IAuthorized> {
  const email = props.body.email;
  const existingCustomer =
    await MyGlobal.prisma.ecommerce_platform_customers.findFirst({
      where: { email },
    });
  if (existingCustomer !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const existingSeller =
    await MyGlobal.prisma.ecommerce_platform_sellers.findFirst({
      where: { email },
    });
  if (existingSeller !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = new Date().toISOString() satisfies string &
    tags.Format<"date-time">;
  const accessExpires = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const sellerId = v4();
  const profileId = v4();
  const requestId = v4();
  const sessionId = v4();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.ecommerce_platform_sellers.create({
      data: {
        id: sellerId,
        email,
        password_hash: passwordHash,
        approval_status: "pending",
        rejection_reason: null,
        is_banned: false,
        created_at: new Date(now),
        updated_at: new Date(now),
        deleted_at: null,
      },
    });
    await tx.ecommerce_platform_seller_profiles.create({
      data: {
        id: profileId,
        seller_id: sellerId,
        shop_name: email,
        shop_description: "",
        logo_image_uri: "",
        created_at: new Date(now),
        updated_at: new Date(now),
        deleted_at: null,
      },
    });
    await tx.ecommerce_platform_seller_approval_requests.create({
      data: {
        id: requestId,
        ecommerce_platform_seller_id: sellerId,
        status: "pending",
        reason: null,
        created_at: new Date(now),
        updated_at: new Date(now),
        deleted_at: null,
      },
    });
    await tx.ecommerce_platform_seller_sessions.create({
      data: {
        id: sessionId,
        ecommerce_platform_seller_id: sellerId,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new Date(now),
        expired_at: new Date(accessExpires),
      },
    });
  });
  const sellerRecord =
    await MyGlobal.prisma.ecommerce_platform_sellers.findUniqueOrThrow({
      where: { id: sellerId },
      ...EcommercePlatformSellerTransformer.select(),
    });
  const sellerDto =
    await EcommercePlatformSellerTransformer.transform(sellerRecord);
  const token: IAuthorizationToken = {
    access: jwt.sign(
      { type: "seller", id: sellerId, session_id: sessionId, created_at: now },
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
  return {
    ...sellerDto,
    deleted_at: sellerDto.deleted_at ?? now,
    token,
  } satisfies IEcommercePlatformSeller.IAuthorized;
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
// import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformAuthSellerJoin(props: {
//   ip: string;
//   body: IEcommercePlatformSeller.IJoin;
// }): Promise<IEcommercePlatformSeller.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------