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

export async function postAuthCustomerLogin(props: {
  body: IShoppingMallCustomer.ILogin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // Find customer by email
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: { email: props.body.email },
  });

  if (!customer) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check account status - only 'active' status can login
  if (customer.status !== "active") {
    if (customer.status === "suspended") {
      throw new HttpException("Account has been suspended", 403);
    }
    if (customer.status === "pending_verification") {
      throw new HttpException("Please verify your email first", 403);
    }
    throw new HttpException("Account is not active", 403);
  }

  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Calculate token expiration times
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Create new session with proper IP handling
  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: customer.id,
      ip: props.body.ip ?? "", // Use empty string as fallback for required field
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date().toISOString(),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
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

  return {
    id: customer.id,
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone_number: customer.phone_number ?? undefined, // Proper undefined handling
    status: customer.status,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    token,
  };
}
