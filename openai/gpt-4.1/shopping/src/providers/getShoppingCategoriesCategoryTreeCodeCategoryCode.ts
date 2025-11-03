import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";

export async function getShoppingCategoriesCategoryTreeCodeCategoryCode(props: {
  categoryTreeCode: string;
  categoryCode: string;
}): Promise<IShoppingCategory> {
  const { categoryTreeCode, categoryCode } = props;

  // Lookup the category tree by code, must not be soft-deleted
  const tree = await MyGlobal.prisma.shopping_category_trees.findFirst({
    where: {
      tree_code: categoryTreeCode,
      deleted_at: null,
    },
  });
  if (!tree) {
    throw new HttpException("Category tree not found or has been deleted", 404);
  }

  // Lookup the category node in this tree by code, must not be soft-deleted
  const category = await MyGlobal.prisma.shopping_categories.findFirst({
    where: {
      category_tree_id: tree.id,
      category_code: categoryCode,
      deleted_at: null,
    },
  });
  if (!category) {
    throw new HttpException("Category not found or has been deleted", 404);
  }

  return {
    id: category.id,
    category_tree_id: category.category_tree_id,
    parent_id: category.parent_id ?? null,
    category_code: category.category_code,
    category_name: category.category_name,
    sort_order: category.sort_order,
    description: category.description ?? null,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at: category.deleted_at
      ? toISOStringSafe(category.deleted_at)
      : null,
  };
}
