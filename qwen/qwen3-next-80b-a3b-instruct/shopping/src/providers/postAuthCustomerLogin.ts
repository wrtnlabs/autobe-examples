import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCustomerLogin(props: {
  email: string;
  password: string;
  body: IShoppingMallCustomer.IRequest;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // Find customer by email - guaranteed to be string by JSON Schema validation
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { email: props.email },
  });

  // Validate customer exists and is active
  if (!customer) {
    throw new HttpException("Invalid credentials", 401);
  }

  if (customer.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  // Verify password using PasswordUtil - no manual validation
  const isValid = await PasswordUtil.verify(
    props.password,
    customer.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Create new customer session with session_id as UUID
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_customer_id: customer.id,
      ip: (props.body as any).ip ?? null,
      href: (props.body as any).href ?? null,
      referrer: (props.body as any).referrer ?? null,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Update customer's last login (updated_at)
  const updatedCustomer = await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: customer.id },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Generate access token with exact payload structure
  const accessToken = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate refresh token
  const refreshToken = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return response with proper types - no Date objects, only string & tags.Format<'date-time'>
  return {
    id: customer.id,
    email: customer.email,
    password_hash: undefined, // Not returned as per IAuthorized definition
    first_name: customer.first_name,
    last_name: customer.last_name,
    status: customer.status,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(updatedCustomer.updated_at),
    deleted_at:
      customer.deleted_at === null
        ? null
        : toISOStringSafe(customer.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies IShoppingMallCustomer.IAuthorized;
}
