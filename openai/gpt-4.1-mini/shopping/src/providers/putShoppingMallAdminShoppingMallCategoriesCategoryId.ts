import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminShoppingMallCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallCategory> {
  const { categoryId, body } = props;

  const existingCategory =
    await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: categoryId },
    });
  if (!existingCategory) {
    throw new HttpException("Category not found", 404);
  }

  const duplicate = await MyGlobal.prisma.shopping_mall_categories.findFirst({
    where: {
      code: body.code,
      NOT: { id: categoryId },
    },
  });
  if (duplicate) {
    throw new HttpException("Duplicate category code", 400);
  }

  if (body.parent_id !== undefined && body.parent_id !== null) {
    const parent = await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: body.parent_id },
    });
    if (!parent) {
      throw new HttpException("Parent category not found", 400);
    }
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_categories.update({
    where: { id: categoryId },
    data: {
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      display_order: body.display_order,
      parent_id: body.parent_id ?? null,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    parent_id: updated.parent_id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    display_order: updated.display_order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
