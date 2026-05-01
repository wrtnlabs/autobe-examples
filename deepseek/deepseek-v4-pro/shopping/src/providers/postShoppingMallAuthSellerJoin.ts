import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSellerJoin(props: {
  ip: string;
  body: IShoppingMallSeller.IJoin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const existing = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const accessExpiresMs = nowMs + 60 * 60 * 1000;
  const accessExpires = new Date(accessExpiresMs).toISOString();
  const refreshExpiresMs = nowMs + 7 * 24 * 60 * 60 * 1000;
  const refreshExpires = new Date(refreshExpiresMs).toISOString();
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      approval_status: "pending",
      rejection_reason: null,
      suspended_at: null,
      banned_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      profile: {
        create: {
          id: v4(),
          shop_name: null,
          shop_description: null,
          logo_image_uri: null,
          created_at: now,
          updated_at: now,
        },
      },
    },
    ...ShoppingMallSellerTransformer.select(),
  });
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4(),
      seller_id: seller.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  const transformed = await ShoppingMallSellerTransformer.transform(seller);
  const tokenCreatedAt = new Date(Date.now()).toISOString();
  return {
    id: transformed.id,
    email: transformed.email,
    approval_status: transformed.approval_status,
    rejection_reason: transformed.rejection_reason,
    suspended_at: transformed.suspended_at,
    banned_at: transformed.banned_at,
    created_at: transformed.created_at,
    updated_at: transformed.updated_at,
    deleted_at: transformed.deleted_at,
    profile: transformed.profile,
    token: {
      access: jwt.sign(
        {
          type: "seller",
          id: seller.id,
          session_id: session.id,
          created_at: tokenCreatedAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "seller",
          id: seller.id,
          session_id: session.id,
          tokenType: "refresh",
          created_at: tokenCreatedAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies IShoppingMallSeller.IAuthorized;
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
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAuthSellerJoin(props: {
//   ip: string;
//   body: IShoppingMallSeller.IJoin;
// }): Promise<IShoppingMallSeller.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     approval_status: ...,
//     rejection_reason: ...,
//     suspended_at: ...,
//     banned_at: ...,
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     profile: await ShoppingMallSellerProfileTransformer.transform(...),
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------