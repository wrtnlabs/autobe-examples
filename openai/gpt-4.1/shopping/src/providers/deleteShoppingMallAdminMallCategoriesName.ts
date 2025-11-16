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

export async function deleteShoppingMallAdminMallCategoriesName(props: {
  admin: AdminPayload;
  name: string;
}): Promise<IShoppingMallCategory> {
  // Lookup category by unique name
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { name: props.name },
  });

  if (category === null) {
    throw new HttpException("Category not found", 404);
  }

  if (category.deleted_at !== null) {
    throw new HttpException(
      "Category is already deactivated (soft deleted)",
      400,
    );
  }

  const now = toISOStringSafe(new Date());

  // Soft delete by updating deleted_at
  const updated = await MyGlobal.prisma.shopping_mall_categories.update({
    where: { name: props.name },
    data: { deleted_at: now },
  });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    sort_order: updated.sort_order,
    status: updated.status,
    parent_id:
      typeof updated.parent_id === "string"
        ? updated.parent_id
        : updated.parent_id === null
          ? null
          : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
