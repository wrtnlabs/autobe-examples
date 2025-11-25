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
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  body: IShoppingMallCustomer.ICreate;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // Use body fields for consistency and to adhere to the DTO contract
  const { email, first_name, last_name } = props.body;

  // Validate that email and password are provided
  if (!email || !props.password) {
    throw new HttpException("Email and password are required", 400);
  }

  // Check for existing customer
  const existingCustomer =
    await MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: { email, deleted_at: null },
    });
  if (existingCustomer) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password using PasswordUtil
  const hashedPassword = await PasswordUtil.hash(props.password);

  // Create customer record with pending_verification status
  const customer = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email,
      password_hash: hashedPassword,
      first_name,
      last_name,
      status: "pending_verification",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  // Create customer session
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_customer_id: customer.id,
      ip: ((props.body as any).ip ?? "") as string,
      href: ((props.body as any).href ?? "") as string,
      referrer: ((props.body as any).referrer ?? "") as string,
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
    },
  });

  // Generate JWT tokens
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

  // Return authorized customer object with token
  return {
    id: customer.id,
    email: customer.email,
    password_hash: hashedPassword,
    first_name: customer.first_name,
    last_name: customer.last_name,
    status: customer.status,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at:
      customer.deleted_at === null
        ? null
        : toISOStringSafe(customer.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies IShoppingMallCustomer.IAuthorized;
}
