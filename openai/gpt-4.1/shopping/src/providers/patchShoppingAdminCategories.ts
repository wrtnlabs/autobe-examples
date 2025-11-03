import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import { IPageIShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminCategories(props: {
  admin: AdminPayload;
  body: IShoppingCategory.IRequest;
}): Promise<IPageIShoppingCategory.ISummary> {
  const { body } = props;
  // Handle pagination defaults and limits
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit =
    body.limit && body.limit > 0 && body.limit <= 100 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Map sort_by/order
  const allowedSortBy = ["sort_order", "name", "category_code", "created_at"];
  const sortBy =
    body.sort_by && allowedSortBy.includes(body.sort_by)
      ? body.sort_by
      : "sort_order";
  const order: "asc" | "desc" = body.order === "desc" ? "desc" : "asc";

  // Build where conditions
  const where: Record<string, unknown> = {
    deleted_at: null,
  };
  // tree_code requires join to category tree to get id
  let treeId: string | undefined = undefined;
  if (body.tree_code) {
    const tree = await MyGlobal.prisma.shopping_category_trees.findFirst({
      where: { tree_code: body.tree_code },
      select: { id: true },
    });
    if (!tree) {
      // Nonexistent tree: return empty page
      return {
        pagination: {
          current: Number(page),
          limit: Number(limit),
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
    treeId = tree.id;
    where.category_tree_id = treeId;
  }
  // parent_id filter
  if (body.parent_id) where.parent_id = body.parent_id;
  // category_name contains
  if (body.name && body.name.length > 0) {
    where.category_name = { contains: body.name };
  }
  // category_code contains
  if (body.category_code && body.category_code.length > 0) {
    where.category_code = { contains: body.category_code };
  }
  // search keyword (applies to code OR name)
  if (body.search && body.search.length > 0) {
    where.OR = [
      { category_name: { contains: body.search } },
      { category_code: { contains: body.search } },
    ];
  }

  // Query total count
  const total = await MyGlobal.prisma.shopping_categories.count({ where });
  // Query paginated results
  const rows = await MyGlobal.prisma.shopping_categories.findMany({
    where,
    orderBy: { [sortBy]: order },
    skip: Number(skip),
    take: Number(limit),
    select: {
      id: true,
      category_code: true,
      category_name: true,
    },
  });
  // Compose result
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: total > 0 ? Math.ceil(total / Number(limit)) : 0,
    },
    data: rows.map((row) => ({
      id: row.id,
      category_code: row.category_code,
      category_name: row.category_name,
    })),
  };
}
