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

export async function postMallPlatformAuthSellerLogin(props: {
  ip: string;
  body: IMallPlatformSeller.ILogin;
}): Promise<IMallPlatformSeller.IAuthorized> {
  const seller = await MyGlobal.prisma.mall_platform_sellers.findUnique({
    where: {
      email: props.body.email,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      status: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (seller === null) throw new HttpException("Invalid credentials", 401);
  if (seller.status !== "approved") throw new HttpException("Forbidden", 403);
  const verified = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!verified) throw new HttpException("Invalid credentials", 401);
  const now = toISOStringSafe(new globalThis.Date());
  const accessExpires = toISOStringSafe(
    new globalThis.Date(globalThis.Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires = toISOStringSafe(
    new globalThis.Date(globalThis.Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.mall_platform_seller_sessions.create({
    data: {
      id: v4(),
      mall_platform_seller_id: seller.id,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
    select: {
      id: true,
    },
  });
  const sellerProfile =
    await MyGlobal.prisma.mall_platform_seller_profiles.findUniqueOrThrow({
      where: {
        seller_account_id: seller.id,
      },
      select: {
        id: true,
        seller_account_id: true,
        shop_name: true,
        shop_description: true,
        logo_image_uri: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const accountStatus: IMallPlatformSellerAccount = {
    status: seller.status,
    rejectionReason: seller.rejection_reason,
  };
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    id: seller.id,
    email: seller.email,
    status: accountStatus,
    rejectionReason: seller.rejection_reason,
    sellerProfile: {
      id: sellerProfile.id,
      sellerAccount: {
        id: seller.id,
        email: seller.email,
        status: accountStatus.status,
        rejectionReason: seller.rejection_reason,
        createdAt: toISOStringSafe(seller.created_at),
        updatedAt: toISOStringSafe(seller.updated_at),
        deletedAt:
          seller.deleted_at === null
            ? null
            : toISOStringSafe(seller.deleted_at),
      },
      shopName: sellerProfile.shop_name,
      shopDescription: sellerProfile.shop_description,
      logoImageUri: sellerProfile.logo_image_uri,
      createdAt: toISOStringSafe(sellerProfile.created_at),
      updatedAt: toISOStringSafe(sellerProfile.updated_at),
      deletedAt:
        sellerProfile.deleted_at === null
          ? null
          : toISOStringSafe(sellerProfile.deleted_at),
    },
    createdAt: toISOStringSafe(seller.created_at),
    updatedAt: toISOStringSafe(seller.updated_at),
    deletedAt:
      seller.deleted_at === null ? null : toISOStringSafe(seller.deleted_at),
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
// export async function postMallPlatformAuthSellerLogin(props: {
//   ip: string;
//   body: IMallPlatformSeller.ILogin;
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