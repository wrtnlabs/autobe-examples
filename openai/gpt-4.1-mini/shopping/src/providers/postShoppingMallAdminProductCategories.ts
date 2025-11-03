import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminProductCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallProductCategory.ICreate;
}): Promise<IShoppingMallProductCategory> {
  const { body } = props;
  const now = toISOStringSafe(new Date());

  const id = v4();

  const created = await MyGlobal.prisma.shopping_mall_product_categories.create(
    {
      data: {
        id,
        parent_id: body.parent_id ?? null,
        name: body.name,
        description: body.description ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id,
    parent_id: created.parent_id ?? null,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
