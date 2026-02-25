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

export async function postShoppingMallAuthCustomerJoin(props: {
  body: IShoppingMallCustomer.IJoin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create customer record directly with correct schema fields
  const now = new Date();
  const created = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.display_name ?? null,
      phone_number: props.body.phone_number ?? null,
      email_verified: false,
      created_at: now,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      phone_number: true,
      email_verified: true,
      created_at: true,
    },
  });
  // 3. Create session record with inline data
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_customer_id: created.id,
      access_token: "",
      refresh_token: "",
      expired_at: accessExpires,
      ip: props.body.ip ?? "127.0.0.1",
      user_agent: null,
      referrer: null,
      created_at: now,
    },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      access_token: true,
      refresh_token: true,
      expired_at: true,
      ip: true,
      user_agent: true,
      referrer: true,
      created_at: true,
    },
  });
  // 4. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "customer" as const,
      id: created.id as string & tags.Format<"uuid">,
      session_id: session.id as string & tags.Format<"uuid">,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "customer" as const,
      id: created.id as string & tags.Format<"uuid">,
      session_id: session.id as string & tags.Format<"uuid">,
      tokenType: "refresh" as const,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Update session with tokens
  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: { id: session.id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
  // 6. Return IAuthorized response with correct field names
  return {
    id: created.id,
    email: created.email,
    display_name: created.display_name,
    phone_number: created.phone_number,
    email_verified: created.email_verified,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.created_at),
    deleted_at: null,
    customer: {
      id: created.id,
      email: created.email,
      display_name: created.display_name,
      phone_number: created.phone_number,
      email_verified: created.email_verified,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.created_at),
    },
    tokens: {
      access_token: accessToken,
      refresh_token: refreshToken,
      access_token_expires_at: toISOStringSafe(session.expired_at),
      refresh_token_expires_at: toISOStringSafe(refreshExpires),
      ip: session.ip,
      user_agent: session.user_agent ?? null,
      referrer: session.referrer ?? null,
      created_at: toISOStringSafe(session.created_at),
      updated_at: toISOStringSafe(session.created_at),
    },
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(session.expired_at),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies IShoppingMallCustomer.IAuthorized;
}
