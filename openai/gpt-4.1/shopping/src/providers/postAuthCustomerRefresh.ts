import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

export async function postAuthCustomerRefresh(props: {
  body: IShoppingCustomer.IRefresh;
}): Promise<IShoppingCustomer.IAuthorized> {
  let decoded: { id: string; session_id: string; type: "customer" };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: "customer" };
  } catch (_) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "customer") {
    throw new HttpException("Invalid token type", 403);
  }
  const session = await MyGlobal.prisma.shopping_customer_sessions.findFirst({
    where: {
      id: decoded.session_id,
      shopping_customer_id: decoded.id,
    },
    include: { customer: true },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (
    session.expired_at !== null &&
    new Date(session.expired_at).getTime() <= Date.now()
  ) {
    throw new HttpException("Session is expired", 401);
  }
  const customer = session.customer;
  if (!customer.is_active) {
    throw new HttpException("Account is inactive", 403);
  }
  if (customer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // Update session context (IP/href/referrer and expiration)
  await MyGlobal.prisma.shopping_customer_sessions.update({
    where: { id: session.id },
    data: {
      ip: props.body.ip ?? session.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      expired_at: refreshExpires,
    },
  });
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    is_active: customer.is_active,
    deleted_at: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : null,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    token,
    role: "customer",
  };
}
