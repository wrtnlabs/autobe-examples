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

export async function putShoppingMallAdminSellersId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallSeller.IUpdate;
}): Promise<IShoppingMallSeller> {
  const { admin, id, body } = props;

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id },
  });

  if (seller.deleted_at !== null) {
    throw new HttpException("Seller not found", 404);
  }

  if (body.email !== undefined) {
    throw new HttpException("Email cannot be changed", 400);
  }

  const updated_at = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id },
    data: {
      password_hash: body.password_hash ?? undefined,
      company_name: body.company_name ?? undefined,
      contact_name: body.contact_name ?? undefined,
      phone_number: body.phone_number ?? undefined,
      status: body.status ?? undefined,
      updated_at,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    company_name: updated.company_name ?? null,
    contact_name: updated.contact_name ?? null,
    phone_number: updated.phone_number ?? null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
