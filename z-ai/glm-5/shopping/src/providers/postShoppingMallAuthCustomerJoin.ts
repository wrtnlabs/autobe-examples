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
import { ShoppingMallCustomerSessionTransformer } from "../transformers/ShoppingMallCustomerSessionTransformer";
import { ShoppingMallCustomerTransformer } from "../transformers/ShoppingMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthCustomerJoin(props: {
  body: IShoppingMallCustomer.IJoin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // 1. Check duplicate account
  const existing = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create customer with hashed password
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const customerId = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  const customer = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: customerId,
      email: props.body.email,
      password_hash: hashedPassword,
      display_name: props.body.displayName ?? null,
      phone_number: props.body.phoneNumber ?? null,
      banned: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...ShoppingMallCustomerTransformer.select(),
  });
  // 3. Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      customer_id: customerId,
      ip: props.body.ip ?? null,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
    ...ShoppingMallCustomerSessionTransformer.select(),
  });
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer",
        id: customerId,
        session_id: session.id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customerId,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 5. Return IAuthorized
  const transformed = await ShoppingMallCustomerTransformer.transform(customer);
  return {
    ...transformed,
    displayName: transformed.displayName ?? null,
    phoneNumber: transformed.phoneNumber ?? null,
    token,
  } satisfies IShoppingMallCustomer.IAuthorized;
}
