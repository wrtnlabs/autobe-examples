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

export async function postAuthCustomerRefresh(props: {
  body: IShoppingMallCustomer.IRequest;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "customer";
  };
  try {
    decoded = jwt.verify(props.body, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "customer";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "customer") {
    throw new HttpException("Invalid token type", 403);
  }

  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: {
        id: decoded.session_id,
        shopping_mall_customer_id: decoded.id,
      },
      include: {
        customer: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  } else if (session.customer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  } else if (session.customer.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  return {
    id: decoded.id,
    email: session.customer.email,
    first_name: session.customer.first_name,
    last_name: session.customer.last_name,
    status: session.customer.status,
    created_at: toISOStringSafe(session.customer.created_at),
    updated_at: toISOStringSafe(session.customer.updated_at),
    deleted_at: session.customer.deleted_at,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
