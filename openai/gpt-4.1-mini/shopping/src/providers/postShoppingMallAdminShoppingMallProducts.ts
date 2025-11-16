import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminShoppingMallProducts(props: {
  admin: AdminPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  const now = toISOStringSafe(new Date());
  const id = v4() satisfies string as string;

  const created = await MyGlobal.prisma.shopping_mall_products.create({
    data: {
      id: id,
      seller: { connect: { id: id } },
      code: props.body.code,
      name: props.body.name,
      description: props.body.description ?? null,
      is_active: props.body.is_active,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
