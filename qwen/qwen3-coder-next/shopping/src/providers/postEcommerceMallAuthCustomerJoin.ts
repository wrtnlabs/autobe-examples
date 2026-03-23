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

export async function postEcommerceMallAuthCustomerJoin(props: {
  ip: string;
  body: IEcommerceMallCustomer.IJoin;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  // 1. Check duplicate email
  const existingCustomer =
    await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
      where: { email: props.body.email },
    });
  if (existingCustomer) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password and create customer
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      email: true,
      created_at: true,
    },
  });
  // 3. Create session
  const session = await MyGlobal.prisma.ecommerce_mall_customer_sessions.create(
    {
      data: {
        id: v4(),
        ecommerce_mall_customer_id: customer.id,
        ip: props.ip,
        href: props.body.href ?? "",
        referrer: props.body.referrer ?? null,
        access_token: "placeholder",
        refresh_token: "placeholder",
        expires_at: toISOStringSafe(accessExpires),
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );
  // 4. Generate JWT tokens
  const accessPayload = {
    type: "customer" as const,
    id: customer.id,
    session_id: session.id,
    created_at: toISOStringSafe(new Date()),
  };
  const refreshPayload = {
    type: "customer" as const,
    id: customer.id,
    session_id: session.id,
    tokenType: "refresh" as const,
    created_at: toISOStringSafe(new Date()),
  };
  const access_token = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh_token = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  // 5. Update session with real tokens
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.update({
    where: { id: session.id },
    data: {
      access_token,
      refresh_token,
    },
  });
  // 6. Create email verification token
  const verificationToken = v4();
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.ecommerce_mall_customer_email_verifications.create({
    data: {
      id: v4(),
      ecommerce_mall_customer_id: customer.id,
      token: verificationToken,
      expires_at: toISOStringSafe(verificationExpires),
      ip: props.ip,
      user_agent: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 7. Build response
  const token = {
    access: access_token,
    refresh: refresh_token,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  const customerSummary: IEcommerceMallCustomer.ISummary = {
    id: customer.id,
    email: customer.email,
    is_suspended: false,
    created_at: toISOStringSafe(customer.created_at),
  };
  return {
    access_token: token.access,
    refresh_token: token.refresh,
    expired_at: token.expired_at,
    customer: customerSummary,
    token,
  } satisfies IEcommerceMallCustomer.IAuthorized;
}
