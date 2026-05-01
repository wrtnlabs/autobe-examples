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

export async function postShoppingMallAuthSellerLogin(props: {
  ip: string;
  body: IShoppingMallSeller.ILogin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: { equals: props.body.email, mode: "insensitive" },
      deleted_at: null,
    },
    select: {
      ...ShoppingMallSellerTransformer.select().select,
      password_hash: true,
    },
  });
  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (seller.banned_at !== null) {
    throw new HttpException("Your account has been banned", 403);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    seller.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const nowIso = new Date().toISOString();
  const accessExpiresIso = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpiresIso = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4(),
      seller_id: seller.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowIso,
      expired_at: accessExpiresIso,
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: nowIso,
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
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  } satisfies IAuthorizationToken;
  const transformed = await ShoppingMallSellerTransformer.transform(seller);
  return {
    ...transformed,
    token,
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
// export async function postShoppingMallAuthSellerLogin(props: {
//   ip: string;
//   body: IShoppingMallSeller.ILogin;
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