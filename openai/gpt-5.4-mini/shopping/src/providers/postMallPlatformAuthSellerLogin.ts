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
import { MallPlatformSellerProfileTransformer } from "../transformers/MallPlatformSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAuthSellerLogin(props: {
  ip: string;
  body: IMallPlatformSeller.ILogin;
}): Promise<IMallPlatformSeller.IAuthorized> {
  const seller = await MyGlobal.prisma.mall_platform_seller_accounts.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      approval_status: true,
      rejection_reason: true,
      suspended_at: true,
      deleted_at: true,
      created_at: true,
      updated_at: true,
      sellerProfile: MallPlatformSellerProfileTransformer.select(),
    },
  });
  if (seller === null) throw new HttpException("Invalid credentials", 401);
  if (seller.approval_status !== "approved")
    throw new HttpException("Invalid credentials", 401);
  if (seller.suspended_at !== null)
    throw new HttpException("Invalid credentials", 401);
  const verified = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!verified) throw new HttpException("Invalid credentials", 401);
  const createdAt = toISOStringSafe(new Date());
  const expiredAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.mall_platform_seller_sessions.create({
    data: {
      id: v4(),
      mall_platform_seller_id: seller.id,
      ip: props.ip,
      href: props.ip,
      referrer: props.ip,
      created_at: createdAt,
      expired_at: expiredAt,
    },
  });
  return {
    id: seller.id,
    email: seller.email,
    status: seller.approval_status,
    rejectionReason: seller.rejection_reason,
    suspendedAt: null,
    deletedAt:
      seller.deleted_at === null ? null : toISOStringSafe(seller.deleted_at),
    createdAt: toISOStringSafe(seller.created_at),
    updatedAt: toISOStringSafe(seller.updated_at),
    sellerProfile:
      seller.sellerProfile === null
        ? null
        : await MallPlatformSellerProfileTransformer.transform(
            seller.sellerProfile,
          ),
    token: {
      access: jwt.sign(
        {
          type: "seller",
          id: seller.id,
          session_id: session.id,
          created_at: createdAt,
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
          created_at: createdAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "7d",
          issuer: "autobe",
        },
      ),
      expired_at: expiredAt,
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
// export async function postMallPlatformAuthSellerLogin(props: {
//   ip: string;
//   body: IMallPlatformSeller.ILogin;
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