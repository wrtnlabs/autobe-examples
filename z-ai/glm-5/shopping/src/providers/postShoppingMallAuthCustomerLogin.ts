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

export async function postShoppingMallAuthCustomerLogin(props: {
  body: IShoppingMallCustomer.ILogin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // 1. Find customer by email with password_hash
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: { email: props.body.email },
    select: {
      ...ShoppingMallCustomerTransformer.select().select,
      password_hash: true,
      deleted_at: true,
    },
  });
  // 2. Validate customer exists and is not deleted
  if (!customer || customer.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Check if banned
  if (customer.banned) {
    throw new HttpException("Account is banned", 403);
  }
  // 4. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 5. Create new session
  const now = new Date().toISOString();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days
  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: v4(),
      customer_id: customer.id,
      ip: props.body.ip,
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
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
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
  // 7. Return IAuthorized using transformer
  const transformedCustomer =
    await ShoppingMallCustomerTransformer.transform(customer);
  return {
    id: transformedCustomer.id,
    email: transformedCustomer.email,
    displayName: transformedCustomer.displayName ?? null,
    phoneNumber: transformedCustomer.phoneNumber ?? null,
    banned: transformedCustomer.banned,
    createdAt: transformedCustomer.createdAt,
    updatedAt: transformedCustomer.updatedAt,
    token,
  } satisfies IShoppingMallCustomer.IAuthorized;
}
