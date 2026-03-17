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
  body: IShoppingMallCustomer.IJoin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const normalizedEmail: string & tags.Format<"email"> = typia.assert<
    string & tags.Format<"email">
  >(props.body.email.trim().toLowerCase());
  const existing = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
    },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const createdAt: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new Date().toISOString());
  const expiredAt: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new Date(Date.now() + 60 * 60 * 1000).toISOString());
  const refreshableUntil: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
  const customerId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(v4());
  const sessionId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(v4());
  const passwordHash: string = await PasswordUtil.hash(props.body.password);
  const ip: string = props.body.ip ?? props.ip;
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const customer = await tx.shopping_mall_customers.create({
      data: {
        id: customerId,
        email: normalizedEmail,
        password_hash: passwordHash,
        banned_at: null,
        created_at: new Date(createdAt),
        updated_at: new Date(createdAt),
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        banned_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    const session = await tx.shopping_mall_customer_sessions.create({
      data: {
        id: sessionId,
        customer: {
          connect: {
            id: customer.id,
          },
        },
        ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new Date(createdAt),
        expired_at: new Date(expiredAt),
      },
      select: {
        id: true,
      },
    });
    return {
      customer,
      session,
    };
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer",
        id: result.customer.id,
        session_id: result.session.id,
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
        id: result.customer.id,
        session_id: result.session.id,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };
  return {
    id: result.customer.id,
    email: result.customer.email,
    banned_at: result.customer.banned_at?.toISOString() ?? null,
    created_at: result.customer.created_at.toISOString(),
    updated_at: result.customer.updated_at.toISOString(),
    deleted_at: result.customer.deleted_at?.toISOString() ?? null,
    token,
  };
}
