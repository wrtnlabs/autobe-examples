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

export async function postMallPlatformAuthSellerRefresh(props: {
  body: IMallPlatformSeller.IRefresh;
}): Promise<IMallPlatformSeller.IAuthorized> {
  const decoded: unknown = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("type" in decoded) ||
    !("id" in decoded) ||
    !("session_id" in decoded) ||
    !("created_at" in decoded) ||
    decoded.type !== "seller" ||
    typeof decoded.id !== "string" ||
    typeof decoded.session_id !== "string" ||
    typeof decoded.created_at !== "string"
  ) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const session = await MyGlobal.prisma.mall_platform_seller_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        seller: {
          is: { id: decoded.id },
        },
      },
      select: {
        id: true,
        seller: true,
        expired_at: true,
      },
    },
  );
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const seller = await MyGlobal.prisma.mall_platform_sellers.findUniqueOrThrow({
    where: { id: decoded.id },
    select: {
      id: true,
      email: true,
      status: true,
      rejection_reason: true,
      deleted_at: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (seller.status !== "approved" && seller.status !== "active") {
    throw new HttpException("Seller account is not eligible for access", 403);
  }
  const issuedAt = toISOStringSafe(new Date());
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.mall_platform_seller_sessions.update({
    where: { id: session.id },
    data: { expired_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
  return {
    id: seller.id,
    email: seller.email,
    status: seller.status,
    rejectionReason: seller.rejection_reason,
    suspendedAt: null,
    deletedAt: null,
    createdAt: toISOStringSafe(seller.created_at),
    updatedAt: toISOStringSafe(seller.updated_at),
    sellerProfile: null,
    token: {
      access: jwt.sign(
        {
          type: "seller",
          id: seller.id,
          session_id: session.id,
          created_at: issuedAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "seller",
          id: seller.id,
          session_id: session.id,
          created_at: issuedAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
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
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformAuthSellerRefresh(props: {
//   body: IMallPlatformSeller.IRefresh;
// }): Promise<IMallPlatformSeller.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     status: ...,
//     rejectionReason: ...,
//     suspendedAt: ...,
//     deletedAt: ...,
//     createdAt: ...,
//     updatedAt: ...,
//     sellerProfile: await MallPlatformSellerProfileTransformer.transform(...),
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------