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

export async function postMallPlatformAuthCustomerLogin(props: {
  ip: string;
  body: IMallPlatformCustomer.ILogin;
}): Promise<IMallPlatformCustomer.IAuthorized> {
  const customer = await MyGlobal.prisma.mall_platform_customers.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (customer === null) throw new HttpException("Invalid credentials", 401);
  if (customer.status !== "active")
    throw new HttpException("Invalid credentials", 401);
  if (customer.deleted_at !== null)
    throw new HttpException("Invalid credentials", 401);
  if (
    (await PasswordUtil.verify(props.body.password, customer.password_hash)) ===
    false
  )
    throw new HttpException("Invalid credentials", 401);
  const expiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 1000 * 60 * 60),
  ) as string & tags.Format<"date-time">;
  const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  ) as string & tags.Format<"date-time">;
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  ) as string & tags.Format<"date-time">;
  const session = await MyGlobal.prisma.mall_platform_customer_sessions.create({
    data: {
      id: v4(),
      mall_platform_customer_id: customer.id,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: createdAt,
      expired_at: expiredAt,
    },
  });
  return {
    id: customer.id,
    email: customer.email,
    status: customer.status,
    createdAt: toISOStringSafe(customer.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(customer.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt:
      customer.deleted_at === null
        ? null
        : (toISOStringSafe(customer.deleted_at) as string &
            tags.Format<"date-time">),
    token: {
      access: jwt.sign(
        {
          type: "customer",
          id: customer.id,
          session_id: session.id,
          created_at: createdAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "customer",
          id: customer.id,
          session_id: session.id,
          created_at: createdAt,
          tokenType: "refresh",
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
