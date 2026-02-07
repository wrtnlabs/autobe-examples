import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCategories(props: {
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory.ISummary> {
  // Get pagination parameters
  const page = (props.body as any).page ?? 1;
  const limit = (props.body as any).limit ?? 10;
  const skip = (page - 1) * limit;
  // Build search conditions
  const whereConditions: Prisma.shopping_mall_categoriesWhereInput = {
    deleted_at: null,
  };
  if ((props.body as any).search) {
    whereConditions.OR = [
      { name: { contains: (props.body as any).search, mode: "insensitive" } },
      {
        description: {
          contains: (props.body as any).search,
          mode: "insensitive",
        },
      },
    ];
  }
  // Get categories with subcategories
  const data = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
      subcategories: {
        where: { deleted_at: null },
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.shopping_mall_categories.count({
    where: whereConditions,
  });
  // Transform to response DTO
  return {
    data: data.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      created_at: toISOStringSafe(category.created_at),
      updated_at: toISOStringSafe(category.updated_at),
      subcategories: category.subcategories.map((subcat) => ({
        id: subcat.id,
        name: subcat.name,
        description: subcat.description,
      })),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
