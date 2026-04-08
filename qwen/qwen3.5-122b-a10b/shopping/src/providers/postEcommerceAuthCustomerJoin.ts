import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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

export async function postEcommerceAuthCustomerJoin(props: {
  ip: string;
  body: IEcommerceCustomer.IJoin;
}): Promise<IEcommerceCustomer.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.ecommerce_customers.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Prepare timestamps
  const now = new Date();
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(now);
  const updatedAt: string & tags.Format<"date-time"> = createdAt;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  // 4. Generate UUIDs
  const customerId: string & tags.Format<"uuid"> = v4();
  const sessionId: string & tags.Format<"uuid"> = v4();
  const verificationTokenId: string & tags.Format<"uuid"> = v4();
  const verificationToken: string = v4();
  // 5. Create customer record
  const customer = await MyGlobal.prisma.ecommerce_customers.create({
    data: {
      id: customerId,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.display_name,
      phone_number: props.body.phone_number ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 6. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer",
        id: customerId,
        session_id: sessionId,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customerId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 7. Create session with actual tokens
  await MyGlobal.prisma.ecommerce_customer_sessions.create({
    data: {
      id: sessionId,
      ecommerce_customer_id: customerId,
      access_token: token.access,
      refresh_token: token.refresh,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 8. Create email verification token
  await MyGlobal.prisma.ecommerce_customer_email_verifications.create({
    data: {
      id: verificationTokenId,
      ecommerce_customer_id: customerId,
      token: verificationToken,
      expires_at: verificationExpires,
      verified_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 9. Return IAuthorized
  return {
    id: customerId,
    display_name: customer.display_name,
    phone_number: customer.phone_number ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: null,
    token,
  } satisfies IEcommerceCustomer.IAuthorized;
}
