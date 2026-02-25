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
  // Step 1: Check if email already exists for uniqueness
  const existing = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Step 2: Hash password using PasswordUtil
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Step 3: Generate now timestamp and UUID using toISOStringSafe
  const nowIso = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const id = v4() as string & tags.Format<"uuid">;
  // Step 4: Create customer
  const customer = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: null,
      phone_number: null,
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Step 5: Create session
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  await MyGlobal.prisma.shopping_mall_customer_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_customer_id: id,
      expired_at: accessExpires,
      created_at: nowIso,
      ip: props.ip,
      href: "",
      referrer: "",
    },
  });
  // Step 6: Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer",
        id,
        session_id: sessionId,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // Step 7: Return authorized customer object
  return {
    id: customer.id,
    email: customer.email,
    displayName: customer.display_name,
    phoneNumber: customer.phone_number,
    createdAt: toISOStringSafe(customer.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(customer.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt:
      customer.deleted_at === null
        ? null
        : (toISOStringSafe(customer.deleted_at) as string &
            tags.Format<"date-time">),
    token,
  };
}
