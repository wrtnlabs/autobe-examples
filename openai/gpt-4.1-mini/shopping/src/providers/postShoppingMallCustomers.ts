import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function postShoppingMallCustomers(props: {
  body: IShoppingMallCustomer.ICreate;
}): Promise<IShoppingMallCustomer> {
  const { body } = props;

  // Check if email already exists
  const existing = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { email: body.email },
    select: { id: true },
  });

  if (existing) {
    throw new HttpException("Conflict: Email already registered", 409);
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: body.email,
      password_hash: body.password_hash,
      nickname: body.nickname ?? null,
      phone_number: body.phone_number ?? null,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    nickname: created.nickname ?? null,
    phone_number: created.phone_number ?? null,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
