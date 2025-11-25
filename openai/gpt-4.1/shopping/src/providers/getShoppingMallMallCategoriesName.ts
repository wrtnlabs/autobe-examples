import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function getShoppingMallMallCategoriesName(props: {
  name: string;
}): Promise<IShoppingMallCategory> {
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { name: props.name },
  });
  if (!category) {
    throw new HttpException("Category not found", 404);
  }
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    sort_order: category.sort_order,
    status: category.status,
    parent_id: category.parent_id === null ? null : category.parent_id,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at:
      category.deleted_at === null
        ? null
        : toISOStringSafe(category.deleted_at),
  };
}
