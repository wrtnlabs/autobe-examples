import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAuthSellerJoin(props: {
  ip: string;
  body: IMallPlatformSeller.IJoin;
}): Promise<IMallPlatformSeller.IAuthorized> {
  const existing = await MyGlobal.prisma.mall_platform_sellers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (existing !== null)
    throw new HttpException("Email already registered", 409);
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const createdAt = new Date();
  const sellerId = v4();
  const profileId = v4();
  const sessionId = v4();
  const accessExpiredAt = new Date(Date.now() + 60 * 60 * 1000);
  const refreshableUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const seller = await MyGlobal.prisma.mall_platform_sellers.create({
    data: {
      id: sellerId,
      email: props.body.email,
      password_hash: passwordHash,
      status: "pending",
      rejection_reason: null,
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      status: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const sellerAccount = {
    status: typia.assert<"pending" | "approved" | "rejected">(seller.status),
    rejectionReason: seller.rejection_reason,
  } satisfies IMallPlatformSellerAccount;
  const sellerSummary = {
    id: seller.id,
    email: seller.email,
    status: sellerAccount.status,
    rejectionReason: sellerAccount.rejectionReason,
    createdAt: seller.created_at.toISOString(),
    updatedAt: seller.updated_at.toISOString(),
    deletedAt: seller.deleted_at?.toISOString() ?? null,
  } satisfies IMallPlatformSeller.ISummary;
  const sellerProfile = {
    id: profileId,
    sellerAccount: sellerSummary,
    shopName: props.body.email,
    shopDescription: "",
    logoImageUri: null,
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
    deletedAt: null,
  } satisfies IMallPlatformSellerProfile;
  const token = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: sessionId,
        created_at: createdAt.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: createdAt.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiredAt.toISOString(),
    refreshable_until: refreshableUntil.toISOString(),
  } satisfies IAuthorizationToken;
  return {
    id: seller.id,
    email: seller.email,
    status: sellerAccount,
    rejectionReason: sellerAccount.rejectionReason,
    sellerProfile,
    createdAt: seller.created_at.toISOString(),
    updatedAt: seller.updated_at.toISOString(),
    deletedAt: seller.deleted_at?.toISOString() ?? null,
    token,
  } satisfies IMallPlatformSeller.IAuthorized;
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
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformAuthSellerJoin(props: {
//   ip: string;
//   body: IMallPlatformSeller.IJoin;
// }): Promise<IMallPlatformSeller.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     status: await MallPlatformSellerAccountTransformer.transform(...),
//     rejectionReason: ...,
//     sellerProfile: await MallPlatformSellerProfileTransformer.transform(...),
//     createdAt: ...,
//     updatedAt: ...,
//     deletedAt: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------