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

export async function postMallPlatformAuthCustomerJoin(props: {
  ip: string;
  body: IMallPlatformCustomer.IJoin;
}): Promise<IMallPlatformCustomer.IAuthorized> {
  const existing = await MyGlobal.prisma.mall_platform_customers.findFirst({
    where: {
      email: props.body.email,
    },
    select: {
      id: true,
    },
  });
  if (existing !== null)
    throw new HttpException("Email already registered", 409);
  const createdAt = toISOStringSafe(new Date());
  const customerId = v4();
  const sessionId = v4();
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.mall_platform_customer_sessions.create({
    data: {
      id: sessionId,
      customer_id: customerId,
      ip: props.ip,
      created_at: createdAt,
      expired_at: refreshExpiresAt,
    } as any,
  });
  const customer = await MyGlobal.prisma.mall_platform_customers.create({
    data: {
      id: customerId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      status: "ACTIVE",
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: sessionId,
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
        session_id: sessionId,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  } satisfies IAuthorizationToken;
  return {
    id: customer.id,
    email: customer.email,
    status: customer.status,
    createdAt: toISOStringSafe(customer.created_at),
    updatedAt: toISOStringSafe(customer.updated_at),
    deletedAt:
      customer.deleted_at !== null && customer.deleted_at !== undefined
        ? toISOStringSafe(customer.deleted_at)
        : null,
    token,
  };
}
