import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingAdminCategoryTreesTreeCodeCategoriesCategoryCode(props: {
  admin: AdminPayload;
  treeCode: string;
  categoryCode: string;
  body: IShoppingCategory.IUpdate;
}): Promise<IShoppingCategory> {
  // 1. Find category tree by treeCode
  const categoryTree = await MyGlobal.prisma.shopping_category_trees.findUnique(
    {
      where: { tree_code: props.treeCode },
    },
  );
  if (!categoryTree) throw new HttpException("Category tree not found", 404);

  // 2. Find target category by categoryCode within tree
  const category = await MyGlobal.prisma.shopping_categories.findUnique({
    where: {
      category_tree_id_category_code: {
        category_tree_id: categoryTree.id,
        category_code: props.categoryCode,
      },
    },
  });
  if (!category) throw new HttpException("Category not found", 404);

  // 3. Validate parent_id if provided
  const updateParentId =
    props.body.parent_id !== undefined
      ? props.body.parent_id
      : category.parent_id;
  if (updateParentId !== undefined && updateParentId !== null) {
    if (updateParentId === category.id) {
      throw new HttpException("A category cannot be its own parent", 400);
    }
    // Check parent exists in same tree
    const parentCandidate =
      await MyGlobal.prisma.shopping_categories.findUnique({
        where: { id: updateParentId },
      });
    if (
      !parentCandidate ||
      parentCandidate.category_tree_id !== categoryTree.id
    ) {
      throw new HttpException(
        "Parent category must exist in the same category tree",
        400,
      );
    }
    // Prevent cycles (walk up the hierarchy)
    let ancestorId = parentCandidate.parent_id;
    while (ancestorId !== null && ancestorId !== undefined) {
      if (ancestorId === category.id) {
        throw new HttpException(
          "Setting parent would create a category hierarchy cycle",
          400,
        );
      }
      const ancestor = await MyGlobal.prisma.shopping_categories.findUnique({
        where: { id: ancestorId },
      });
      if (!ancestor) break;
      ancestorId = ancestor.parent_id;
    }
  }

  // 4. Enforce name/sort_order uniqueness among siblings (must not match other sibling except self and only non-deleted)
  const siblingParentId = updateParentId ?? null;
  // category_name uniqueness
  const duplicateName = await MyGlobal.prisma.shopping_categories.findFirst({
    where: {
      category_tree_id: categoryTree.id,
      parent_id: siblingParentId,
      category_name: props.body.category_name,
      id: { not: category.id },
      deleted_at: null,
    },
  });
  if (duplicateName) {
    throw new HttpException(
      "Another sibling category already has this category_name",
      409,
    );
  }
  // sort_order uniqueness
  const duplicateSortOrder =
    await MyGlobal.prisma.shopping_categories.findFirst({
      where: {
        category_tree_id: categoryTree.id,
        parent_id: siblingParentId,
        sort_order: props.body.sort_order,
        id: { not: category.id },
        deleted_at: null,
      },
    });
  if (duplicateSortOrder) {
    throw new HttpException(
      "Another sibling category already has this sort_order",
      409,
    );
  }

  // 5. Proceed with the update
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_categories.update({
    where: { id: category.id },
    data: {
      category_name: props.body.category_name,
      sort_order: props.body.sort_order,
      description: props.body.description ?? null,
      parent_id: updateParentId ?? null,
      updated_at: now,
    },
  });

  // 6. Audit log (system log)
  await MyGlobal.prisma.shopping_system_logs.create({
    data: {
      id: v4(),
      event_time: now,
      log_level: "info",
      event_type: "category.update",
      event_source: "admin_api",
      message: `Category ${category.category_code} updated by admin ${props.admin.id}`,
      details: JSON.stringify({
        admin_id: props.admin.id,
        category_id: category.id,
        updated_fields: {
          category_name: updated.category_name,
          sort_order: updated.sort_order,
          description: updated.description,
          parent_id: updated.parent_id,
        },
        tree_id: updated.category_tree_id,
      }),
      created_at: now,
    },
  });

  // 7. Return updated node strictly matching IShoppingCategory
  return {
    id: updated.id,
    category_tree_id: updated.category_tree_id,
    parent_id: typeof updated.parent_id === "string" ? updated.parent_id : null,
    category_code: updated.category_code,
    category_name: updated.category_name,
    sort_order: updated.sort_order,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
