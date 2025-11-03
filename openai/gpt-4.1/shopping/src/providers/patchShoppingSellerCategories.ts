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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingSellerCategories(props: {
  seller: SellerPayload;
  body: IShoppingCategory.IRequest;
}): Promise<IPageIShoppingCategory.ISummary> {
  const {
    tree_code,
    parent_id,
    name,
    category_code,
    depth,
    sort_by,
    order,
    page,
    limit,
    search,
  } = props.body;

  // Filtering conditions: always deleted_at === null
  const where = {
    deleted_at: null,
    ...(tree_code !== undefined && { categoryTree: { tree_code } }),
    ...(parent_id !== undefined && { parent_id }),
    ...(typeof depth === "number" &&
      {
        /* Not an actual column, calculated outside, ignore depth unless schema adds it */
      }),
    ...(name !== undefined && { category_name: { contains: name } }),
    ...(category_code !== undefined && {
      category_code: { contains: category_code },
    }),
    ...(search !== undefined &&
      search.trim() !== "" && {
        OR: [
          { category_name: { contains: search } },
          { category_code: { contains: search } },
        ],
      }),
  };

  // Supported sort fields
  const allowedSortFields = [
    "sort_order",
    "name",
    "category_code",
    "created_at",
  ];
  const actualSortField = allowedSortFields.includes(sort_by ?? "")
    ? sort_by
    : "sort_order";

  let orderByField: string;
  switch (actualSortField) {
    case "name":
      orderByField = "category_name";
      break;
    case "category_code":
      orderByField = "category_code";
      break;
    case "created_at":
      orderByField = "created_at";
      break;
    default:
      orderByField = "sort_order";
  }
  const orderDirection = order === "desc" ? "desc" : "asc";

  const actualPage = typeof page === "number" && page > 0 ? page : 1;
  const actualLimit =
    typeof limit === "number" && limit > 0 && limit <= 100 ? limit : 20;
  const skip = (actualPage - 1) * actualLimit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_categories.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: actualLimit,
      select: {
        id: true,
        category_code: true,
        category_name: true,
      },
    }),
    MyGlobal.prisma.shopping_categories.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(actualPage),
      limit: Number(actualLimit),
      records: total,
      pages: Math.ceil(total / actualLimit),
    },
    data: rows.map((category) => ({
      id: category.id,
      category_code: category.category_code,
      category_name: category.category_name,
    })),
  };
}
