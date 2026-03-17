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
  const nowIso = new Date().toISOString();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!customer) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (customer.status !== "active") {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValidPassword = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!isValidPassword) {
    throw new HttpException("Invalid credentials", 401);
  }
  const sessionId: string & tags.Format<"uuid"> = v4();
  const access_token: string & tags.Format<"password"> = jwt.sign(
    {
      type: "customer" as const,
      customer_id: customer.id,
      session_id: sessionId,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh_token: string & tags.Format<"password"> = jwt.sign(
    {
      type: "customer" as const,
      customer_id: customer.id,
      session_id: sessionId,
      tokenType: "refresh" as const,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_customer_id: customer.id,
      access_token: access_token,
      refresh_token: refresh_token,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowIso,
      updated_at: nowIso,
      expired_at: accessExpires.toISOString(),
    },
  });
  const result: IEcommerceMallCustomer.IAuthorized = {
    id: customer.id,
    display_name: customer.email,
    phone_number: null,
    status: customer.status,
    created_at: customer.created_at.toISOString(),
    updated_at: customer.updated_at.toISOString(),
    deleted_at:
      customer.deleted_at === null ? null : customer.deleted_at.toISOString(),
    email: customer.email,
    token: {
      access: access_token,
      refresh: refresh_token,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  };
  return result;
}
