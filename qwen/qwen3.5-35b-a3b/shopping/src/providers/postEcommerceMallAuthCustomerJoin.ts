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
  const email = props.body.email;
  const password = props.body.password;
  const existing = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: { email: email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const id: string & tags.Format<"uuid"> = v4();
  const passwordHash: string = await PasswordUtil.hash(password);
  await MyGlobal.prisma.ecommerce_mall_customers.create({
    data: {
      id: id,
      email: email,
      password_hash: passwordHash,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  const verificationId: string & tags.Format<"uuid"> = v4();
  const verificationToken = v4();
  const expiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.ecommerce_mall_customer_email_verifications.create({
    data: {
      id: verificationId,
      customer_id: id,
      email: email,
      token: verificationToken,
      token_type: "registration",
      expires_at: new Date(expiresAt),
      is_used: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  const sessionId: string & tags.Format<"uuid"> = v4();
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_customer_id: id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      expired_at: new Date(accessExpires),
      access_token: "",
      refresh_token: "",
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer",
        id: id,
        session_id: sessionId,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: id,
        session_id: sessionId,
        created_at: new Date().toISOString(),
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    id: id,
    display_name: "",
    phone_number: null,
    status: "active",
    created_at: toISOStringSafe(new Date()),
    updated_at: toISOStringSafe(new Date()),
    deleted_at: null,
    email: email,
    token: token,
  } satisfies IEcommerceMallCustomer.IAuthorized;
}
