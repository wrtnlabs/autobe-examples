import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategoryTree";
import { IPageIShoppingCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingCategoryTree";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingCategoryTrees(props: {
  body: IShoppingCategoryTree.IRequest;
}): Promise<IPageIShoppingCategoryTree.ISummary> {
  const body = props.body;
  const page = body.page && body.page > 0 ? body.page : 1;
  let limit = body.limit && body.limit > 0 ? body.limit : 20;
  if (limit > 100) limit = 100;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.tree_code !== undefined &&
      body.tree_code !== null &&
      body.tree_code.length > 0 && {
        tree_code: { contains: body.tree_code },
      }),
    ...(body.tree_name !== undefined &&
      body.tree_name !== null &&
      body.tree_name.length > 0 && {
        tree_name: { contains: body.tree_name },
      }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
  };

  const orderBy =
    body.sort_by &&
    ["tree_code", "tree_name", "created_at"].includes(body.sort_by)
      ? {
          [body.sort_by]: (body.order === "asc"
            ? "asc"
            : "desc") as Prisma.SortOrder,
        }
      : { created_at: "desc" as Prisma.SortOrder };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_category_trees.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_category_trees.count({ where }),
  ]);

  const data = rows.map((tree) => {
    const summary: IShoppingCategoryTree.ISummary = {
      id: tree.id,
      tree_code: tree.tree_code,
      tree_name: tree.tree_name,
      description: tree.description ?? undefined,
    };
    return summary;
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
