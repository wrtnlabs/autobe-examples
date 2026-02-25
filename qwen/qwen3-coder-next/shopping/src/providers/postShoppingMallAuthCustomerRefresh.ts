import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthCustomerRefresh(props: {
  body: IShoppingMallCustomer.IRefresh;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // Verify refresh token
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "customer";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate type
  if (decoded.type !== "customer") {
    throw new HttpException("Invalid token type", 403);
  }
  // Validate session
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: {
        id: decoded.session_id,
        shopping_mall_customer_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Validate customer account
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (customer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Calculate expiration times
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const createdAt = toISOStringSafe(new Date());
  // Generate new tokens
  const access = jwt.sign(
    {
      type: "customer" as const,
      id: customer.id,
      session_id: session.id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "customer" as const,
      id: customer.id,
      session_id: session.id,
      tokenType: "refresh" as const,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Update session
  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: { id: session.id },
    data: {
      access_token: access,
      refresh_token: refresh,
      expired_at: refreshExpires,
    },
  });
  // Build response - fix null values for required fields
  return {
    id: customer.id,
    email: customer.email,
    display_name: customer.display_name,
    phone_number: customer.phone_number,
    email_verified: customer.email_verified,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: customer.updated_at
      ? toISOStringSafe(customer.updated_at)
      : toISOStringSafe(new Date()),
    deleted_at: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : null,
    customer: {
      id: customer.id,
      email: customer.email,
      display_name: customer.display_name,
      phone_number: customer.phone_number,
      email_verified: customer.email_verified,
      created_at: toISOStringSafe(customer.created_at),
      updated_at: customer.updated_at
        ? toISOStringSafe(customer.updated_at)
        : toISOStringSafe(new Date()),
    },
    tokens: {
      access_token: access,
      refresh_token: refresh,
      access_token_expires_at: accessExpires,
      refresh_token_expires_at: refreshExpires,
      ip: session.ip,
      user_agent: session.user_agent,
      href: null,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      updated_at: toISOStringSafe(session.created_at), // Use created_at as fallback since updated_at may not exist
      deleted_at: null,
    },
    token: {
      access: access,
      refresh: refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
