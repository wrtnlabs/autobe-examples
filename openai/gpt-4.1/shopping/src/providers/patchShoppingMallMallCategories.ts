import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallMallCategories(props: {
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory.ISummary> {
  // Extract parameters, applying defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where condition functionally
  const where = {
    ...(props.body.name && {
      name: {
        contains: props.body.name,
        mode: "insensitive" as Prisma.QueryMode,
      },
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    // parent_id: supports exact UUID match, or null (root)
    ...(props.body.parent_id !== undefined && {
      parent_id: props.body.parent_id,
    }),
    // No filter on deleted_at (returns all, including deleted)
  };

  // Determine sort
  const allowedSortFields = ["sort_order", "name", "created_at", "status"];
  const sortField =
    props.body.sort_field && allowedSortFields.includes(props.body.sort_field)
      ? props.body.sort_field
      : "sort_order";
  const sortOrder: "asc" | "desc" = props.body.sort_order ?? "asc";
  // Always order by created_at desc secondarily for stable pagination
  const orderBy = [
    { [sortField]: sortOrder as Prisma.SortOrder },
    { created_at: "desc" as Prisma.SortOrder },
  ];

  // Run in parallel for performance
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_categories.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_categories.count({ where }),
  ]);

  // Map data to output DTOs
  const result = data.map(
    (cat): IShoppingMallCategory.ISummary => ({
      id: cat.id,
      name: cat.name,
      parent_id: cat.parent_id === null ? null : cat.parent_id,
      description: cat.description,
      status: cat.status,
      sort_order: cat.sort_order,
      updated_at: toISOStringSafe(cat.updated_at),
      deleted_at:
        cat.deleted_at === null ? null : toISOStringSafe(cat.deleted_at),
    }),
  );

  return {
    data: result,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
