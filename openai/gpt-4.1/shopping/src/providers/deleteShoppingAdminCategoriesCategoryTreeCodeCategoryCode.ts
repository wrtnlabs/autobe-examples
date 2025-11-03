import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminCategoriesCategoryTreeCodeCategoryCode(props: {
  admin: AdminPayload;
  categoryTreeCode: string;
  categoryCode: string;
}): Promise<void> {
  // 1. Find the category tree by tree_code
  const tree = await MyGlobal.prisma.shopping_category_trees.findUnique({
    where: { tree_code: props.categoryTreeCode },
    select: { id: true },
  });
  if (!tree) {
    throw new HttpException("Category tree not found", 404);
  }
  // 2. Find target category by composite (tree_id, category_code)
  const category = await MyGlobal.prisma.shopping_categories.findUnique({
    where: {
      category_tree_id_category_code: {
        category_tree_id: tree.id,
        category_code: props.categoryCode,
      },
    },
    select: { id: true, parent_id: true, deleted_at: true },
  });
  if (!category || category.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  // 3. Prevent deleting root node
  if (category.parent_id === null) {
    throw new HttpException("Cannot delete root category node", 403);
  }
  // 4. Check if category has any non-deleted children
  const childCount = await MyGlobal.prisma.shopping_categories.count({
    where: {
      parent_id: category.id,
      deleted_at: null,
    },
  });
  if (childCount > 0) {
    throw new HttpException(
      "Cannot delete category with children. Remove or reassign all children first.",
      400,
    );
  }
  // 5. Hard delete the category
  await MyGlobal.prisma.shopping_categories.delete({
    where: { id: category.id },
  });
}
