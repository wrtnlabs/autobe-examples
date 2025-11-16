import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCustomerLogin(props: {
  body: IShoppingMallCustomer.ILogin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: { email: props.body.email },
  });
  if (!customer) {
    throw new HttpException("Invalid credentials", 401);
  }

  const isValid = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const nowTimestamp = Date.now();
  const accessExpiresTimestamp = nowTimestamp + 60 * 60 * 1000; // 1 hour
  const refreshExpiresTimestamp = nowTimestamp + 7 * 24 * 60 * 60 * 1000; // 7 days

  const nowIso = toISOStringSafe(new Date(nowTimestamp));
  const accessExpires = toISOStringSafe(new Date(accessExpiresTimestamp));
  const refreshExpires = toISOStringSafe(new Date(refreshExpiresTimestamp));

  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: customer.id,
      ip: (props.body.ip ?? "") satisfies string as string,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowIso,
      expired_at: accessExpires,
    },
  });

  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: nowIso,
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
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    status: "active",
    created_at: toISOStringSafe(customer.created_at),
    updated_at:
      customer.updated_at !== null && customer.updated_at !== undefined
        ? toISOStringSafe(customer.updated_at)
        : null,
    token,
  };
}
