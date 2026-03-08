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
import { EcommerceMallCustomerSessionTransformer } from "../transformers/EcommerceMallCustomerSessionTransformer";
import { EcommerceMallCustomerTransformer } from "../transformers/EcommerceMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthCustomerJoin(props: {
  body: IEcommerceMallCustomer.IJoin;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create customer
  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      is_banned: false,
      ban_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...EcommerceMallCustomerTransformer.select(),
  });
  // 3. Create session
  const sessionExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.ecommerce_mall_customer_sessions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        customer_id: customer.id,
        ip: props.body.ip ?? "0.0.0.0",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new Date(),
        expired_at: new Date(sessionExpiresAt),
      },
      ...EcommerceMallCustomerSessionTransformer.select(),
    },
  );
  // 4. Create email verification token
  const verificationToken = v4() as string;
  const verificationExpires: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000));
  await MyGlobal.prisma.ecommerce_mall_customer_email_verifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      customer_id: customer.id,
      token: verificationToken,
      expires_at: new Date(verificationExpires),
      used_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 5. Generate JWT tokens
  const jwtPayload: {
    type: "customer";
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    created_at: string & tags.Format<"date-time">;
  } = {
    type: "customer",
    id: customer.id,
    session_id: session.id,
    created_at: nowIso,
  };
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const token: IAuthorizationToken = {
    access: jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      {
        ...jwtPayload,
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 6. Return IAuthorized
  const transformedCustomer =
    await EcommerceMallCustomerTransformer.transform(customer);
  return {
    ...transformedCustomer,
    banReason: transformedCustomer.banReason ?? null,
    token,
  } satisfies IEcommerceMallCustomer.IAuthorized;
}
