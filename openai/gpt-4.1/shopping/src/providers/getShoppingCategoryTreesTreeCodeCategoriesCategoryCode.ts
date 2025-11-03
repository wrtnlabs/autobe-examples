import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";

export async function getShoppingCategoryTreesTreeCodeCategoriesCategoryCode(props: {
  treeCode: string;
  categoryCode: string;
}): Promise<IShoppingCategory> {
  const categoryTree = await MyGlobal.prisma.shopping_category_trees.findFirst({
    where: {
      tree_code: props.treeCode,
      deleted_at: null,
    },
  });
  if (!categoryTree) {
    throw new HttpException("Category tree not found", 404);
  }

  const category = await MyGlobal.prisma.shopping_categories.findFirst({
    where: {
      category_tree_id: categoryTree.id,
      category_code: props.categoryCode,
      deleted_at: null,
    },
  });
  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  return {
    id: category.id,
    category_tree_id: category.category_tree_id,
    parent_id: category.parent_id ?? undefined,
    category_code: category.category_code,
    category_name: category.category_name,
    sort_order: category.sort_order,
    description: category.description ?? undefined,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at: category.deleted_at
      ? toISOStringSafe(category.deleted_at)
      : undefined,
  };
}
