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
  const existing = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const now = new Date();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  // 2. Create customer record
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 3. Create email verification token
  const verificationToken = v4();
  await MyGlobal.prisma.ecommerce_mall_customer_email_verifications.create({
    data: {
      id: v4(),
      customer_id: customer.id,
      email: props.body.email,
      token: verificationToken,
      token_type: "registration",
      expires_at: verificationExpires,
      is_used: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 4. Create session record with JWT tokens
  const tokenPayload = {
    type: "customer" as const,
    id: customer.id,
    session_id: "", // Will be set after session creation
    created_at: "" as string & tags.Format<"date-time">,
  };
  const session = await MyGlobal.prisma.ecommerce_mall_customer_sessions.create(
    {
      data: {
        id: v4(),
        ecommerce_mall_customer_id: customer.id,
        access_token: "",
        refresh_token: "",
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        expired_at: accessExpires,
      },
    },
  );
  // 5. Generate JWT tokens
  tokenPayload.session_id = session.id;
  tokenPayload.created_at = now.toISOString() as string &
    tags.Format<"date-time">;
  const access = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    {
      ...tokenPayload,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // 6. Return IAuthorized pattern
  return {
    id: customer.id as string & tags.Format<"uuid">,
    display_name: "",
    phone_number: null,
    status: customer.status,
    created_at: now.toISOString() as string & tags.Format<"date-time">,
    updated_at: now.toISOString() as string & tags.Format<"date-time">,
    deleted_at: null,
    email: customer.email,
    token,
  } satisfies IEcommerceMallCustomer.IAuthorized;
}
