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
  const decoded: unknown = await new Promise((resolve, reject) => {
    jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
      (error, payload) => {
        if (error) {
          reject(new HttpException("Invalid or expired refresh token", 401));
          return;
        }
        resolve(payload);
      },
    );
  });
  if (
    decoded === null ||
    typeof decoded !== "object" ||
    !("id" in decoded) ||
    !("session_id" in decoded) ||
    !("type" in decoded) ||
    typeof decoded.id !== "string" ||
    typeof decoded.session_id !== "string" ||
    typeof decoded.type !== "string" ||
    decoded.type !== "seller"
  ) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const session = await MyGlobal.prisma.mall_platform_seller_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        mall_platform_seller_id: decoded.id,
      },
      select: {
        id: true,
        mall_platform_seller_id: true,
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
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const issuedAt = toISOStringSafe(seller.updated_at) as string &
    tags.Format<"date-time">;
  const accessExpiresAt = toISOStringSafe(seller.created_at) as string &
    tags.Format<"date-time">;
  const refreshExpiresAt = toISOStringSafe(seller.created_at) as string &
    tags.Format<"date-time">;
  const status: IMallPlatformSellerAccount = {
    status:
      seller.status === "pending" ||
      seller.status === "approved" ||
      seller.status === "rejected"
        ? seller.status
        : "pending",
    rejectionReason: seller.rejection_reason,
  };
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: issuedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe", expiresIn: "1h" },
    ),
    refresh: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: issuedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe", expiresIn: "7d" },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
  return {
    id: seller.id,
    email: seller.email,
    status,
    rejectionReason: seller.rejection_reason,
    sellerProfile: {
      id: seller.id,
      sellerAccount: {
        id: seller.id,
        email: seller.email,
        status: status.status,
        rejectionReason: status.rejectionReason,
        createdAt: toISOStringSafe(seller.created_at),
        updatedAt: toISOStringSafe(seller.updated_at),
        deletedAt: null,
      },
      shopName: "",
      shopDescription: "",
      logoImageUri: null,
      createdAt: toISOStringSafe(seller.created_at),
      updatedAt: toISOStringSafe(seller.updated_at),
      deletedAt: null,
    },
    createdAt: toISOStringSafe(seller.created_at),
    updatedAt: toISOStringSafe(seller.updated_at),
    deletedAt: null,
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
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
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