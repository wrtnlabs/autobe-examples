import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
  // 1. Check for duplicate email
  const existingSeller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst(
    {
      where: { email: props.body.email },
    },
  );
  if (existingSeller) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Generate IDs and timestamps as strings
  const sellerId = v4();
  const profileId = v4();
  const sessionId = v4();
  const now = new Date().toISOString();
  // 4. Create seller with approval_status='pending'
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.create({
    data: {
      id: sellerId,
      email: props.body.email,
      password_hash: passwordHash,
      approval_status: "pending",
      rejection_reason: null,
      rejected_at: null,
      created_at: new Date(now),
      updated_at: new Date(now),
      deleted_at: null,
    },
  });
  // 5. Create seller profile
  const profile = await MyGlobal.prisma.ecommerce_mall_seller_profiles.create({
    data: {
      id: profileId,
      seller_id: sellerId,
      name: "",
      description: "",
      logo_uri: null,
      created_at: new Date(now),
      updated_at: new Date(now),
      deleted_at: null,
    },
  });
  // 6. Generate JWT tokens
  const accessExpiresIn = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpiresIn = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const accessToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "seller",
      id: seller.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Create session
  await MyGlobal.prisma.ecommerce_mall_seller_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_seller_id: sellerId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      access_token: accessToken,
      refresh_token: refreshToken,
      created_at: new Date(now),
      expired_at: new Date(accessExpiresIn),
    },
  });
  // 8. Return IAuthorized response
  return {
    id: seller.id as string & tags.Format<"uuid">,
    email: seller.email as string & tags.Format<"email">,
    approvalStatus: seller.approval_status as
      | "pending"
      | "approved"
      | "rejected",
    rejectionReason: seller.rejection_reason,
    rejectedAt: seller.rejected_at
      ? (seller.rejected_at.toISOString() as string & tags.Format<"date-time">)
      : null,
    profile: {
      id: profile.id as string & tags.Format<"uuid">,
      name: profile.name,
      description: profile.description,
      logo_uri: profile.logo_uri,
      seller: {
        id: seller.id as string & tags.Format<"uuid">,
        email: seller.email as string & tags.Format<"email">,
        approvalStatus: seller.approval_status as
          | "pending"
          | "approved"
          | "rejected",
        createdAt: seller.created_at.toISOString() as string &
          tags.Format<"date-time">,
      },
      created_at: profile.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: profile.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      deleted_at: profile.deleted_at
        ? (profile.deleted_at.toISOString() as string &
            tags.Format<"date-time">)
        : null,
    },
    productsCount: 0 as number & tags.Type<"int32">,
    createdAt: seller.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updatedAt: seller.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deletedAt: seller.deleted_at
      ? (seller.deleted_at.toISOString() as string & tags.Format<"date-time">)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresIn as string & tags.Format<"date-time">,
      refreshable_until: refreshExpiresIn as string & tags.Format<"date-time">,
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
// import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
//     rejectionReason: ...,
//     rejectedAt: ...,
//     profile: await EcommerceMallSellerProfileTransformer.transform(...),
//     productsCount: ...,
//     createdAt: ...,
//     updatedAt: ...,
//     deletedAt: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------