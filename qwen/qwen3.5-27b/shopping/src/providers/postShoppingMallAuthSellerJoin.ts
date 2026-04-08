import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Create seller record
  const now = new Date();
  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: passwordHash,
      approval_status: "pending",
      approval_reason: null,
      rejection_reason: null,
      suspended: false,
      banned: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...ShoppingMallSellerTransformer.select(),
  });
  // 4. Create seller profile record with default values
  await MyGlobal.prisma.shopping_mall_seller_profiles.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_seller_id: seller.id,
      shop_name: "New Seller Shop",
      shop_description: "This seller has not completed their profile yet.",
      logo_uri: null,
      approval_status: "pending",
      rejection_reason: null,
      is_suspended: false,
      is_banned: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 5. Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_seller_id: seller.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 6. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "seller",
        id: seller.id,
        session_id: session.id,
        created_at: now.toISOString(),
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
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 7. Return IAuthorized response
  return {
    ...(await ShoppingMallSellerTransformer.transform(seller)),
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
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAuthSellerJoin(props: {
//   ip: string;
//   body: IShoppingMallSeller.IJoin;
// }): Promise<IShoppingMallSeller.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------