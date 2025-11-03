import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminCategoryTreesTreeCodeCategoriesCategoryCode(props: {
  admin: AdminPayload;
  treeCode: string;
  categoryCode: string;
}): Promise<void> {
  // 1. Find the category tree by tree_code
  const tree = await MyGlobal.prisma.shopping_category_trees.findUnique({
    where: { tree_code: props.treeCode },
  });
  if (!tree) {
    throw new HttpException("Category tree not found", 404);
  }

  // 2. Find the target category by (category_tree_id, category_code) and not already soft-deleted
  const category = await MyGlobal.prisma.shopping_categories.findFirst({
    where: {
      category_tree_id: tree.id,
      category_code: props.categoryCode,
      deleted_at: null,
    },
  });
  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  // 3. Prevent deletion if there are child categories
  const childCount = await MyGlobal.prisma.shopping_categories.count({
    where: {
      parent_id: category.id,
      deleted_at: null,
    },
  });
  if (childCount > 0) {
    throw new HttpException(
      "Cannot delete: category has child categories. Remove/reparent children first.",
      409,
    );
  }

  // 4. Prevent deletion if there are product assignments
  const assignmentsCount =
    await MyGlobal.prisma.shopping_category_product_assignments.count({
      where: {
        shopping_category_id: category.id,
      },
    });
  if (assignmentsCount > 0) {
    throw new HttpException(
      "Cannot delete: category is assigned to products. Remove all assignments first.",
      409,
    );
  }

  // 5. Perform hard delete
  await MyGlobal.prisma.shopping_categories.delete({
    where: { id: category.id },
  });

  // 6. Audit log for the deletion
  await MyGlobal.prisma.shopping_audit_logs.create({
    data: {
      id: v4(),
      admin_id: props.admin.id,
      seller_id: null,
      customer_id: null,
      category: "category",
      event_type: "CATEGORY_DELETE",
      ip: null,
      description: `Category '${category.category_name}' (code: ${category.category_code}) deleted from tree '${tree.tree_name}' (code: ${tree.tree_code}) by admin.`,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
}
