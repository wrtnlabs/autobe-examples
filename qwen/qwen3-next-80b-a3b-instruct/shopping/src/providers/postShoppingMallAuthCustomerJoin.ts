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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthCustomerJoin(props: {
  ip: string;
  href: string;
  referrer: string;
  body: IShoppingMallCustomer.IJoin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // 1. Check for duplicate email (case-insensitive)
  const existing = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: { email: props.body.email.toLowerCase() },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Create customer record (manual, since collector not available and specally permitted for manual in this flow)
  const customer = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email.toLowerCase(),
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: undefined,
      phone_number: undefined,
      created_at: toISOStringSafe(new Date()) satisfies string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) satisfies string &
        tags.Format<"date-time">,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
    },
  });
  // 3. Create email verification token (required per specification)
  const tokenValue = v4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await MyGlobal.prisma.shopping_mall_customer_email_verifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_customer_id: customer.id,
      token: tokenValue,
      expires_at: toISOStringSafe(expiresAt) satisfies string &
        tags.Format<"date-time">,
      created_at: toISOStringSafe(new Date()) satisfies string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) satisfies string &
        tags.Format<"date-time">,
      verified_at: null,
    },
  });
  // 4. Create session
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_customer_id: customer.id,
      ip: props.ip || "unknown",
      href: props.href || "unknown",
      referrer: props.referrer || "unknown",
      created_at: toISOStringSafe(new Date()) satisfies string &
        tags.Format<"date-time">,
      expired_at: toISOStringSafe(accessExpires) satisfies string &
        tags.Format<"date-time">,
    },
    select: {
      id: true,
      created_at: true,
      expired_at: true,
    },
  });
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id, // Use customer.id (actor ID), NOT session.id
        session_id: session.id,
        created_at: toISOStringSafe(new Date()) satisfies string &
          tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customer.id, // Use customer.id (actor ID), NOT session.id
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()) satisfies string &
          tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires) satisfies string &
      tags.Format<"date-time">,
    refreshable_until: toISOStringSafe(refreshExpires) satisfies string &
      tags.Format<"date-time">,
  };
  // 6. Return IAuthorized
  return {
    id: customer.id,
    email: customer.email,
    display_name: customer.display_name ?? undefined,
    phone_number: customer.phone_number ?? undefined,
    created_at: toISOStringSafe(customer.created_at) satisfies string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(customer.updated_at) satisfies string &
      tags.Format<"date-time">,
    token,
  } satisfies IShoppingMallCustomer.IAuthorized;
}
