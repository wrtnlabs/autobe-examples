import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminSellers(props: {
  admin: AdminPayload;
  body: IShoppingMallSeller.ICreate;
}): Promise<IShoppingMallSeller> {
  const { body } = props;
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id,
      email: body.email,
      password_hash: body.password_hash,
      company_name: body.company_name ?? null,
      contact_name: body.contact_name ?? null,
      phone_number: body.phone_number ?? null,
      status: body.status,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    } satisfies Prisma.shopping_mall_sellersCreateInput,
  });

  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    company_name: created.company_name ?? null,
    contact_name: created.contact_name ?? null,
    phone_number: created.phone_number ?? null,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
