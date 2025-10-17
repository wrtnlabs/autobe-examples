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

export async function patchShoppingMallCategories(props: {
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory> {
  const { body } = props;

  // Extract and validate page parameter with default to 1, ensure minimum of 1
  const requestedPage = body.page ?? 1;
  const page = requestedPage < 1 ? 1 : requestedPage;
  const limit = 20;
  const skip = (page - 1) * limit;

  // Build where clause for customer-facing category list
  const where = {
    deleted_at: null,
    is_active: true,
  };

  // Execute concurrent queries for categories and total count
  const [categories, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_categories.findMany({
      where,
      orderBy: { display_order: "asc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_categories.count({ where }),
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(total / limit);

  // Return paginated response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: totalPages,
    },
    data: categories,
  };
}
