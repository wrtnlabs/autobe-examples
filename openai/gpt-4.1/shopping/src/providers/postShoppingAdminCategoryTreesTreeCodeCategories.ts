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

export async function postShoppingAdminCategoryTreesTreeCodeCategories(props: {
  admin: AdminPayload;
  treeCode: string;
  body: IShoppingCategory.ICreate;
}): Promise<IShoppingCategory> {
  // 1. Verify that the category tree exists for treeCode
  const tree = await MyGlobal.prisma.shopping_category_trees.findFirst({
    where: { tree_code: props.treeCode, deleted_at: null },
  });
  if (!tree) {
    throw new HttpException("Category tree not found", 404);
  }

  // 2. Enforce unique (category_tree_id, category_code) constraint
  const duplicate = await MyGlobal.prisma.shopping_categories.findFirst({
    where: {
      category_tree_id: tree.id,
      category_code: props.body.category_code,
      deleted_at: null,
    },
  });
  if (duplicate) {
    throw new HttpException("Category code already exists in this tree", 409);
  }

  // 3. If parent_id given, check it exists in same tree
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    const parent = await MyGlobal.prisma.shopping_categories.findFirst({
      where: {
        id: props.body.parent_id,
        category_tree_id: tree.id,
        deleted_at: null,
      },
    });
    if (!parent) {
      throw new HttpException(
        "Specified parent_id does not exist in this tree",
        400,
      );
    }
  }

  // 4. Create the new category row
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_categories.create({
    data: {
      id: v4(),
      category_tree_id: tree.id,
      category_code: props.body.category_code,
      category_name: props.body.category_name,
      parent_id: props.body.parent_id ?? null,
      sort_order: props.body.sort_order,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 5. Return the new category, prop handling per IShoppingCategory
  return {
    id: created.id,
    category_tree_id: created.category_tree_id,
    parent_id: created.parent_id ?? undefined,
    category_code: created.category_code,
    category_name: created.category_name,
    sort_order: created.sort_order,
    description: created.description ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
