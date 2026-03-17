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

export async function postShoppingMallAuthCustomerLogin(props: {
  ip: string;
  body: IShoppingMallCustomer.ILogin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      email: props.body.email,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      banned_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (customer === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  const valid: boolean = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (valid === false) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (customer.banned_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (customer.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(now);
  const accessExpiredAt: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpiresAt);
  const refreshableUntil: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpiresAt);
  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: v4(),
      customer: {
        connect: {
          id: customer.id,
        },
      },
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: createdAt,
      expired_at: accessExpiredAt,
    },
    select: {
      id: true,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshableUntil,
  };
  return {
    id: customer.id,
    email: customer.email,
    banned_at:
      customer.banned_at === null ? null : toISOStringSafe(customer.banned_at),
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at:
      customer.deleted_at === null
        ? null
        : toISOStringSafe(customer.deleted_at),
    token,
  };
}
