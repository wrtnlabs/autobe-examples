import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategoryTree";

export async function getShoppingCategoryTreesTreeCode(props: {
  treeCode: string;
}): Promise<IShoppingCategoryTree> {
  const row = await MyGlobal.prisma.shopping_category_trees.findUnique({
    where: { tree_code: props.treeCode },
  });
  if (!row || row.deleted_at) {
    throw new HttpException("Category tree not found", 404);
  }
  return {
    id: row.id,
    tree_code: row.tree_code,
    tree_name: row.tree_name,
    description: row.description ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  };
}
