import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategoryTree";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingAdminCategoryTreesTreeCode(props: {
  admin: AdminPayload;
  treeCode: string;
  body: IShoppingCategoryTree.IUpdate;
}): Promise<IShoppingCategoryTree> {
  // Confirm admin exists and is active (defense in depth)
  const adminRow = await MyGlobal.prisma.shopping_admins.findFirst({
    where: { id: props.admin.id, deleted_at: null, status: "active" },
  });
  if (!adminRow) {
    throw new HttpException(
      "Unauthorized: Admin not enrolled or not active",
      403,
    );
  }

  // Find the category tree to update by tree_code
  const tree = await MyGlobal.prisma.shopping_category_trees.findFirst({
    where: { tree_code: props.treeCode, deleted_at: null },
  });
  if (!tree) {
    throw new HttpException("Category tree not found", 404);
  }

  // Enforce: tree_code cannot be updated
  // Prepare update data (description is optional)
  const updated = await MyGlobal.prisma.shopping_category_trees.update({
    where: { id: tree.id },
    data: {
      tree_name: props.body.tree_name,
      description: props.body.description ?? undefined,
      updated_at: props.body.updated_at,
    },
  });

  return {
    id: updated.id,
    tree_code: updated.tree_code,
    tree_name: updated.tree_name,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
