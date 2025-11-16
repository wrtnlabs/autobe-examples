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

export async function patchShoppingMallMallCategoriesNameChildren(props: {
  name: string;
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory.ISummary> {
  // 1. Retrieve parent category by name
  const parent = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { name: props.name },
    select: { id: true },
  });
  if (!parent) {
    return {
      data: [],
      pagination: {
        current: props.body.page ?? 1,
        limit: props.body.limit ?? 20,
        records: 0,
        pages: 0,
      },
    };
  }
  // 2. Build filter for child categories
  const where: Record<string, unknown> = {
    parent_id: parent.id,
  };
  if (props.body.name !== undefined) {
    where.name = props.body.name;
  }
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  }
  if (props.body.parent_id !== undefined) {
    where.parent_id = props.body.parent_id;
  }
  // 3. Count total direct children for pagination
  const total = await MyGlobal.prisma.shopping_mall_categories.count({
    where,
  });
  // 4. Pagination window
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 5. Sorting
  const sortField = props.body.sort_field ?? "sort_order";
  const sortOrder = props.body.sort_order ?? "asc";
  // 6. Retrieve paginated children
  const childRows = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where,
    skip,
    take: limit,
    orderBy: { [sortField]: sortOrder },
  });
  // 7. Map DB rows to ISummary with safe datetime handling
  const data = childRows.map((row) => ({
    id: row.id,
    name: row.name,
    parent_id: row.parent_id === null ? null : row.parent_id,
    description: row.description,
    status: row.status,
    sort_order: row.sort_order,
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));
  // 8. Build response page
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
