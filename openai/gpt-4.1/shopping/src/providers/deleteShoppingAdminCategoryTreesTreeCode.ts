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

export async function deleteShoppingAdminCategoryTreesTreeCode(props: {
  admin: AdminPayload;
  treeCode: string;
}): Promise<IShoppingCategoryTree> {
  const tree = await MyGlobal.prisma.shopping_category_trees.findFirst({
    where: {
      tree_code: props.treeCode,
      deleted_at: null,
    },
  });
  if (!tree) {
    throw new HttpException("Category tree not found or already archived", 404);
  }
  const deletedAt = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_category_trees.update({
    where: {
      id: tree.id,
    },
    data: {
      deleted_at: deletedAt,
      updated_at: deletedAt,
    },
  });
  return {
    id: updated.id,
    tree_code: updated.tree_code,
    tree_name: updated.tree_name,
    description: updated.description === null ? undefined : updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: deletedAt,
  };
}
