import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAuthCustomerRefresh(props: {
  body: IMallPlatformCustomer.IRefresh;
}): Promise<IMallPlatformCustomer.IAuthorized> {
  const decoded: unknown = (() => {
    try {
      return jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      });
    } catch {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
  })();
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("type" in decoded) ||
    !("id" in decoded) ||
    !("session_id" in decoded) ||
    typeof decoded.type !== "string" ||
    typeof decoded.id !== "string" ||
    typeof decoded.session_id !== "string" ||
    decoded.type !== "customer"
  ) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const session =
    await MyGlobal.prisma.mall_platform_customer_sessions.findFirst({
      where: {
        id: decoded.session_id,
        mall_platform_customer_id: decoded.id,
      },
      select: {
        id: true,
        expired_at: true,
      },
    });
  if (session === null)
    throw new HttpException("Session expired or revoked", 401);
  const customer =
    await MyGlobal.prisma.mall_platform_customers.findUniqueOrThrow({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (customer.deleted_at !== null)
    throw new HttpException("Account has been deleted", 403);
  if (customer.status !== "active")
    throw new HttpException(
      "Account is not permitted to access the platform",
      403,
    );
  const accessExpiresAt = toISOStringSafe(
    new Date(
      session.expired_at.getTime() > 0
        ? session.expired_at.getTime()
        : Date.now(),
    ),
  ) as string & tags.Format<"date-time">;
  const refreshExpiresAt = toISOStringSafe(
    new Date(
      session.expired_at.getTime() > 0
        ? session.expired_at.getTime() + 7 * 24 * 60 * 60 * 1000
        : Date.now() + 7 * 24 * 60 * 60 * 1000,
    ),
  ) as string & tags.Format<"date-time">;
  const accessToken = jwt.sign(
    {
      type: "customer",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: accessExpiresAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: "1h" },
  );
  const refreshToken = jwt.sign(
    {
      type: "customer",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: refreshExpiresAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: "7d" },
  );
  await MyGlobal.prisma.mall_platform_customer_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: new Date(refreshExpiresAt),
    },
  });
  return {
    id: customer.id,
    email: customer.email,
    status: customer.status,
    createdAt: toISOStringSafe(customer.created_at),
    updatedAt: toISOStringSafe(customer.updated_at),
    deletedAt:
      customer.deleted_at === null
        ? null
        : toISOStringSafe(customer.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
