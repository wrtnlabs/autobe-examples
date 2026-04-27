import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ECommerceMallSellerTransformer } from "../transformers/ECommerceMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallAuthSellerJoin(props: {
  ip: string;
  body: IECommerceMallSeller.IJoin;
}): Promise<IECommerceMallSeller.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.e_commerce_mall_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Generate timestamps as ISO strings
  const now = new Date().toISOString();
  const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 4. Create seller + profile atomically
  const seller = await MyGlobal.prisma.e_commerce_mall_sellers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      approval_status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      profile: {
        create: {
          id: v4(),
          shop_name: props.body.shop_name,
          shop_description: props.body.shop_description ?? null,
          logo_image: props.body.logo_image ?? null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      },
    },
    ...ECommerceMallSellerTransformer.select(),
  });
  // 5. Create session
  const session = await MyGlobal.prisma.e_commerce_mall_seller_sessions.create({
    data: {
      id: v4(),
      e_commerce_mall_seller_id: seller.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpiresAt,
    },
  });
  // 6. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: now,
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
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
  // 7. Transform and return IAuthorized
  return {
    ...(await ECommerceMallSellerTransformer.transform(seller)),
    token,
  } satisfies IECommerceMallSeller.IAuthorized;
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
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallAuthSellerJoin(props: {
//   ip: string;
//   body: IECommerceMallSeller.IJoin;
// }): Promise<IECommerceMallSeller.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     approval_status: ...,
//     profile: await ECommerceMallSellerProfileTransformer.transform(...),
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------