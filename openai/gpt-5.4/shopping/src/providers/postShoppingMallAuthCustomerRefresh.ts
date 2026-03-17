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

export async function postShoppingMallAuthCustomerRefresh(props: {
  body: IShoppingMallCustomer.IRefresh;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const unauthorized = (): HttpException =>
    new HttpException("Invalid or expired refresh token", 401);
  const now = new globalThis.Date();
  const decodedToken = (() => {
    try {
      return jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      });
    } catch {
      throw unauthorized();
    }
  })();
  if (typeof decodedToken !== "object" || decodedToken === null) {
    throw unauthorized();
  }
  if (!Object.prototype.hasOwnProperty.call(decodedToken, "type")) {
    throw unauthorized();
  }
  if (!Object.prototype.hasOwnProperty.call(decodedToken, "id")) {
    throw unauthorized();
  }
  if (!Object.prototype.hasOwnProperty.call(decodedToken, "session_id")) {
    throw unauthorized();
  }
  const tokenType = decodedToken.type;
  const customerId = decodedToken.id;
  const sessionId = decodedToken.session_id;
  if (typeof tokenType !== "string") {
    throw unauthorized();
  }
  if (typeof customerId !== "string") {
    throw unauthorized();
  }
  if (typeof sessionId !== "string") {
    throw unauthorized();
  }
  if (tokenType !== "customer") {
    throw unauthorized();
  }
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: {
        id: sessionId,
        shopping_mall_customer_id: customerId,
      },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        expired_at: true,
      },
    });
  if (session === null) {
    throw unauthorized();
  }
  if (session.expired_at.getTime() <= now.getTime()) {
    throw unauthorized();
  }
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: {
        id: session.shopping_mall_customer_id,
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
  if (customer.banned_at !== null || customer.deleted_at !== null) {
    throw new HttpException(
      "Customer account is not eligible for authentication",
      403,
    );
  }
  const accessExpiredAt = new globalThis.Date(now.getTime() + 60 * 60 * 1000);
  const refreshableUntil = new globalThis.Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const createdAt = toISOStringSafe(now);
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
    expired_at: toISOStringSafe(accessExpiredAt),
    refreshable_until: toISOStringSafe(refreshableUntil),
  };
  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: {
      id: session.id,
    },
    data: {
      expired_at: refreshableUntil,
    },
  });
  return {
    id: customer.id,
    email: customer.email,
    banned_at: null,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at: null,
    token,
  };
}
