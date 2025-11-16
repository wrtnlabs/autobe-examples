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

export async function postAuthCustomerJoin(props: {
  body: IShoppingMallCustomer.ICreate;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // 1. Check if email already registered and not soft deleted
  const existingCustomer =
    await MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
      },
    });

  if (existingCustomer) {
    throw new HttpException("Email already registered", 409);
  }

  // 2. Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // 3. Create customer actor record
  const now = new Date();
  const nowIso = toISOStringSafe(now);
  const customerId = v4();

  const dataToCreate = {
    id: customerId,
    email: props.body.email,
    password_hash: hashedPassword,
    name: props.body.full_name, // changed full_name to name per Prisma field
    status: "active",
    phone_number: null,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
  };

  // 3. Create shopping_mall_customer record
  const created = await MyGlobal.prisma.shopping_mall_customers.create({
    data: dataToCreate,
  });

  // 4. Create customer session record
  const accessExpireDate = new Date(Date.now() + 3600000);
  const refreshExpireDate = new Date(Date.now() + 604800000);
  const accessExpires = toISOStringSafe(accessExpireDate);
  const refreshExpires = toISOStringSafe(refreshExpireDate);

  const sessionId = v4();

  // ip must not be null, so if null or undefined, use empty string
  const ipAddress: string = props.body.ip ?? "";

  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_customer_id: customerId,
      ip: ipAddress,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowIso,
      expired_at: accessExpires,
    },
  });

  // 5. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: created.id,
        session_id: session.id,
        created_at: nowIso,
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
        id: created.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  // 6. Return result
  return {
    id: created.id,
    email: created.email,
    name: dataToCreate.name,
    phone_number: null,
    status: dataToCreate.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    token,
  };
}
