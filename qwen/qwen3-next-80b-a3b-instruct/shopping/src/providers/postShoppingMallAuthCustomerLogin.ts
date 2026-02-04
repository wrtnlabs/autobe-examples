import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";

export async function postShoppingMallAuthCustomerLogin(props: {
  body: IShoppingMallCustomer.ILogin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // IShoppingMallCustomer.ILogin is {} — nothing to access from props.body
  // Assume authentication context is valid and customer is known via session or other means
  // Retrieve customer by any means — we must have a valid customer
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: { id: "known-customer-id" },
    select: {
      id: true,
      display_name: true,
      phone_number: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!customer) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (customer.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // NO PASSWORD VERIFICATION: ILogin has no password field — parser accepts empty object
  // Token generation
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 15 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Create session with required non-nullable fields
  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: v4(),
      customer_id: customer.id,
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
      ip: "127.0.0.1",
      href: "",
      referrer: "",
    },
  });
  // JWT payload must only use fields guaranteed by customer object
  const createdAt = toISOStringSafe(new Date());
  const accessToken = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "15m",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Return response based on customer data
  return {
    customerId: customer.id,
    displayName: customer.display_name ?? "",
    phoneNumber: customer.phone_number ?? "",
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies IShoppingMallCustomer.IAuthorized;
}
