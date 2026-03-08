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

export async function postEcommerceMallAuthCustomerRefresh(props: {
  body: IEcommerceMallCustomer.IRefresh;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  const refreshTokenPayload = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  if (
    typeof refreshTokenPayload !== "object" ||
    refreshTokenPayload === null ||
    !("type" in refreshTokenPayload) ||
    !("id" in refreshTokenPayload) ||
    !("session_id" in refreshTokenPayload)
  ) {
    throw new HttpException("Invalid refresh token structure", 401);
  }
  const decodedType = refreshTokenPayload.type;
  const decodedId = refreshTokenPayload.id;
  const decodedSessionId = refreshTokenPayload.session_id;
  if (decodedType !== "customer") {
    throw new HttpException("Invalid token type", 401);
  }
  const session =
    await MyGlobal.prisma.ecommerce_mall_customer_sessions.findFirst({
      where: {
        id: decodedSessionId,
        customer_id: decodedId,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.expired_at < new Date()) {
    throw new HttpException("Session has expired", 401);
  }
  const customer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: decodedId },
    });
  if (customer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (customer.is_banned) {
    throw new HttpException("Account is banned", 403);
  }
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const now = toISOStringSafe(new Date());
  const access = jwt.sign(
    {
      type: decodedType,
      id: decodedId,
      session_id: decodedSessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: decodedType,
      id: decodedId,
      session_id: decodedSessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.update({
    where: { id: decodedSessionId },
    data: {
      expired_at: new Date(refreshExpires),
      href: props.body.href,
      referrer: props.body.referrer,
      ip: props.body.ip ?? undefined,
    },
  });
  return {
    id: customer.id,
    email: customer.email,
    isBanned: customer.is_banned,
    banReason: customer.ban_reason,
    createdAt: toISOStringSafe(customer.created_at),
    updatedAt: toISOStringSafe(customer.updated_at),
    deletedAt:
      customer.deleted_at !== null
        ? toISOStringSafe(customer.deleted_at)
        : null,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
