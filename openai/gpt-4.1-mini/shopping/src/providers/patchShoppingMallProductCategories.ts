import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallProductCategories(props: {
  body: IShoppingMallProductCategory.IRequest;
}): Promise<IPageIShoppingMallProductCategory.ISummary> {
  const {
    page = 1,
    limit = 20,
    sort_by = "name",
    order = "asc",
    filter_name,
    filter_description,
    filter_parent_id,
    include_deleted = false,
  } = props.body;

  const sanitizedOrder = order === "asc" || order === "desc" ? order : "asc";
  const sanitizedSortBy =
    sort_by === "name" || sort_by === "created_at" || sort_by === "updated_at"
      ? sort_by
      : "name";

  const where: Prisma.shopping_mall_product_categoriesWhereInput = {
    ...(include_deleted ? {} : { deleted_at: null }),
    ...(filter_name !== undefined && filter_name !== null
      ? { name: { contains: filter_name } }
      : {}),
    ...(filter_description !== undefined && filter_description !== null
      ? { description: { contains: filter_description } }
      : {}),
  };

  if (filter_parent_id !== undefined) {
    if (filter_parent_id === null) {
      where.parent_id = null;
    } else {
      where.parent_id = filter_parent_id;
    }
  }

  const orderBy =
    sanitizedSortBy === "name"
      ? { name: sanitizedOrder }
      : sanitizedSortBy === "created_at"
        ? { created_at: sanitizedOrder }
        : { updated_at: sanitizedOrder };

  const skip = (page > 0 ? page - 1 : 0) * limit;

  const [categories, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_categories.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        parent_id: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_product_categories.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      parent_id: cat.parent_id ?? null,
    })),
  };
}
