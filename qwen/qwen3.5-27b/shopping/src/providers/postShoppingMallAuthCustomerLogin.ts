import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCustomerTransformer } from "../transformers/ShoppingMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthCustomerLogin(props: {
  ip: string;
  body: IShoppingMallCustomer.ILogin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // 1. Find customer by email with password_hash
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: { email: props.body.email },
    select: {
      ...ShoppingMallCustomerTransformer.select().select,
      password_hash: true,
    },
  });
  if (!customer) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Check if customer is banned or deleted
  if (customer.banned || customer.deleted_at !== null) {
    throw new HttpException("Account is inactive or banned", 403);
  }
  // 3. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Generate session and tokens
  const sessionId = v4();
  const now = new Date();
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: sessionId,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 5. Create session with tokens
  await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_customer_id: customer.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      updated_at: now,
      expired_at: accessExpires,
      access_token: token.access,
      refresh_token: token.refresh,
      deleted_at: null,
    },
  });
  // 6. Return IAuthorized
  return {
    ...(await ShoppingMallCustomerTransformer.transform(customer)),
    token,
  } satisfies IShoppingMallCustomer.IAuthorized;
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
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAuthCustomerLogin(props: {
//   ip: string;
//   body: IShoppingMallCustomer.ILogin;
// }): Promise<IShoppingMallCustomer.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     banned: ...,
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     profile: await ShoppingMallCustomerProfileTransformer.transform(...),
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------