import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthCustomerLogin(props: {
  ip: string;
  body: IEcommerceMallCustomer.ILogin;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  // 1. Find customer by email with password_hash
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: { email: props.body.email, deleted_at: null },
    select: {
      id: true,
      email: true,
      password_hash: true,
      is_banned: true,
      ban_reason: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!customer) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid: boolean = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Check ban status
  if (customer.is_banned) {
    throw new HttpException(
      customer.ban_reason !== null ? customer.ban_reason : "Account is banned",
      401,
    );
  }
  // 4. Create session with proper timestamp handling
  const accessExpires: Date = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionCreatedAt: Date = new Date();
  const session = await MyGlobal.prisma.ecommerce_mall_customer_sessions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        customer_id: customer.id,
        ip:
          props.body.ip !== null && props.body.ip !== undefined
            ? props.body.ip
            : props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: sessionCreatedAt,
        expired_at: accessExpires,
      },
    },
  );
  // 5. Generate JWT tokens with proper typing
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: sessionCreatedAt.toISOString(),
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
        created_at: sessionCreatedAt.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 6. Return IAuthorized with proper date format
  const result: IEcommerceMallCustomer.IAuthorized = {
    id: customer.id as string & tags.Format<"uuid">,
    email: customer.email,
    is_banned: customer.is_banned,
    ban_reason: customer.ban_reason,
    created_at: customer.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: customer.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    token,
  };
  return result;
}
