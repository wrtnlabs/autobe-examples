import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCustomerJoin(props: {
  body: IShoppingMallCustomer.ICreate;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // Check for duplicate email
  const existingCustomer =
    await MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: { email: props.body.email },
    });

  if (existingCustomer) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Create customer record
  const customerId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const customer = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: customerId,
      email: props.body.email,
      password_hash: hashedPassword,
      first_name: props.body.first_name,
      last_name: props.body.last_name,
      phone_number: props.body.phone_number ?? null,
      status: "pending_verification",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Create session record
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_customer_id: customer.id,
      ip: props.body.ip ?? "unknown",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
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
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Return authorized customer data
  return {
    id: customer.id,
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone_number:
      customer.phone_number === null ? undefined : customer.phone_number,
    status: customer.status,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    token,
  };
}
