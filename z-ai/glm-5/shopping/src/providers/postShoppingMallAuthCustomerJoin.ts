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
  // 1. Check for duplicate email (case-insensitive)
  const existing = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      email: props.body.email.toLowerCase(),
    },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create customer with hashed password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const customerId = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  const customer = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: customerId,
      email: props.body.email.toLowerCase(),
      password_hash: passwordHash,
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
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: sessionId,
      customer_id: customerId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: sessionExpires,
    },
  });
  // 4. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customerId,
        session_id: sessionId,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customerId,
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
  // 5. Return IAuthorized
  const transformed = await ShoppingMallCustomerTransformer.transform(customer);
  return {
    ...transformed,
    token,
  };
}
