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
  body: IShoppingMallCustomer.IRefresh;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // Verify and decode refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "customer";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "customer";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Validate token type
  if (decoded.type !== "customer") {
    throw new HttpException("Invalid token type", 403);
  }

  // Validate session exists and is active
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: {
        id: decoded.session_id,
        shopping_mall_customer_id: decoded.id,
        expired_at: null,
      },
      include: {
        customer: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Validate customer account is active
  if (
    session.customer.status !== "active" ||
    session.customer.deleted_at !== null
  ) {
    throw new HttpException("Account has been suspended or deleted", 403);
  }

  // Generate new tokens with same session ID
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Update session expiration time
  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  // Return customer authorization data
  return {
    id: session.customer.id as string & tags.Format<"uuid">,
    email: session.customer.email as string & tags.Format<"email">,
    first_name: session.customer.first_name,
    last_name: session.customer.last_name,
    phone_number: session.customer.phone_number ?? undefined,
    status: session.customer.status,
    created_at: toISOStringSafe(session.customer.created_at),
    updated_at: toISOStringSafe(session.customer.updated_at),
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    },
  };
}
