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
import { ShoppingMallSellerProfileTransformer } from "../transformers/ShoppingMallSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSellerRefresh(props: {
  body: IShoppingMallSeller.IRefresh;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // 1. Verify refresh token — narrow without 'as'
  const payload = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  });
  if (typeof payload === "string") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const decodedId: string = payload.id;
  const decodedSessionId: string = payload.session_id;
  const decodedType: string = payload.type;
  // 2. Validate token type
  if (decodedType !== "seller") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists and is not expired
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst(
    {
      where: {
        id: decodedSessionId,
        seller_id: decodedId,
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.expired_at.getTime() < Date.now()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate seller account — not deleted, not banned
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: decodedId },
    include: {
      profile: ShoppingMallSellerProfileTransformer.select(),
    },
  });
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 401);
  }
  if (seller.banned_at !== null) {
    throw new HttpException("Account has been banned", 401);
  }
  // 5. Generate new token pair — reuse SAME session_id
  const nowMs: number = Date.now();
  const accessExpiresMs: number = nowMs + 60 * 60 * 1000;
  const refreshExpiresMs: number = nowMs + 7 * 24 * 60 * 60 * 1000;
  const accessToken: string = jwt.sign(
    {
      type: "seller",
      id: decodedId,
      session_id: decodedSessionId,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "seller",
      id: decodedId,
      session_id: decodedSessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: { id: decodedSessionId },
    data: { expired_at: new Date(refreshExpiresMs) },
  });
  // 7. Transform profile for response
  if (!seller.profile) {
    throw new HttpException("Seller profile not found", 500);
  }
  const profile: IShoppingMallSellerProfile =
    await ShoppingMallSellerProfileTransformer.transform(seller.profile);
  return {
    id: seller.id,
    email: seller.email,
    approval_status: seller.approval_status,
    rejection_reason: seller.rejection_reason,
    suspended_at: seller.suspended_at
      ? toISOStringSafe(seller.suspended_at)
      : null,
    banned_at: null,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.updated_at),
    deleted_at: null,
    profile,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(accessExpiresMs)),
      refreshable_until: toISOStringSafe(new Date(refreshExpiresMs)),
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
// export async function postShoppingMallAuthSellerRefresh(props: {
//   body: IShoppingMallSeller.IRefresh;
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