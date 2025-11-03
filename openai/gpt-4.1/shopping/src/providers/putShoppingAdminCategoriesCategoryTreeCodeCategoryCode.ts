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

export async function putShoppingAdminCategoriesCategoryTreeCodeCategoryCode(props: {
  admin: AdminPayload;
  categoryTreeCode: string;
  categoryCode: string;
  body: IShoppingCategory.IUpdate;
}): Promise<IShoppingCategory> {
  const { categoryTreeCode, categoryCode, body } = props;

  // Step 1: Find tree
  const tree = await MyGlobal.prisma.shopping_category_trees.findUnique({
    where: { tree_code: categoryTreeCode },
  });
  if (!tree) {
    throw new HttpException("Category tree not found", 404);
  }

  // Step 2: Find category node in the tree by code
  const category = await MyGlobal.prisma.shopping_categories.findFirst({
    where: {
      category_tree_id: tree.id,
      category_code: categoryCode,
      deleted_at: null,
    },
  });
  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  // Step 3: parent_id validation (if updating parent)
  let validParentId: string | undefined = undefined;
  if (body.parent_id !== undefined) {
    if (body.parent_id === null) {
      validParentId = undefined;
    } else {
      // Parent cannot be self
      if (body.parent_id === category.id) {
        throw new HttpException("Category cannot be its own parent.", 400);
      }
      // Parent must be in the same tree
      const parent = await MyGlobal.prisma.shopping_categories.findFirst({
        where: {
          id: body.parent_id,
          category_tree_id: tree.id,
          deleted_at: null,
        },
      });
      if (!parent) {
        throw new HttpException("Parent category not found in this tree.", 400);
      }
      // Prevent direct cycle (parent is child of self)
      // Check parent ancestry for cycle (parent_id chain cannot reach self)
      let currentId = parent.parent_id;
      while (currentId) {
        if (currentId === category.id) {
          throw new HttpException("Invalid parent: would create a cycle.", 400);
        }
        const next = await MyGlobal.prisma.shopping_categories.findFirst({
          where: { id: currentId, category_tree_id: tree.id },
          select: { parent_id: true },
        });
        currentId = next ? (next.parent_id ?? null) : null;
      }
      validParentId = body.parent_id;
    }
  }

  // Step 4: Update the category node
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_categories.update({
    where: { id: category.id },
    data: {
      category_name: body.category_name,
      sort_order: body.sort_order,
      description: body.description ?? undefined,
      parent_id: validParentId,
      updated_at: now,
    },
  });

  // Step 5: Build response
  return {
    id: updated.id,
    category_tree_id: updated.category_tree_id,
    parent_id: updated.parent_id ?? undefined,
    category_code: updated.category_code,
    category_name: updated.category_name,
    sort_order: updated.sort_order,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
