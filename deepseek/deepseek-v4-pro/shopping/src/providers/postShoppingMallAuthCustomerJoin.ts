import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

export async function postShoppingMallAuthCustomerJoin(props: {
  ip: string;
  body: IShoppingMallCustomer.IJoin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const existing = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const passwordHash: string = await PasswordUtil.hash(props.body.password);
  const now: string = new Date().toISOString();
  const accessExpires: string = new Date(
    Date.now() + 15 * 60 * 1000,
  ).toISOString();
  const refreshExpires: string = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const verificationExpires: string = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const customer = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.display_name,
      phone_number: props.body.phone_number ?? null,
      banned_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...ShoppingMallCustomerTransformer.select(),
  });
  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: customer.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: refreshExpires,
    },
    select: { id: true },
  });
  await MyGlobal.prisma.shopping_mall_customer_email_verifications.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: customer.id,
      token: v4(),
      expired_at: verificationExpires,
      created_at: now,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  const transformed = await ShoppingMallCustomerTransformer.transform(customer);
  return {
    ...transformed,
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
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAuthCustomerJoin(props: {
//   ip: string;
//   body: IShoppingMallCustomer.IJoin;
// }): Promise<IShoppingMallCustomer.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------