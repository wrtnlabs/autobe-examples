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

export async function getShoppingMallCategories(): Promise<IPageIShoppingMallCategory.ISummary> {
  const whereCondition = {
    deleted_at: null,
  } satisfies Prisma.shopping_mall_categoriesWhereInput;
  const categories = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where: whereCondition,
    orderBy: { created_at: "asc" },
  });
  const total = await MyGlobal.prisma.shopping_mall_categories.count({
    where: whereCondition,
  });
  // Build subcategory count map
  const subcategoryCountMap = new Map<string, number>();
  categories.forEach((category) => {
    if (category.parent_category_id) {
      const currentCount =
        subcategoryCountMap.get(category.parent_category_id) || 0;
      subcategoryCountMap.set(category.parent_category_id, currentCount + 1);
    }
  });
  // Transform categories to DTO format
  const data = categories.map((category) => {
    const subcategoryCount = subcategoryCountMap.get(category.id) || 0;
    return {
      id: category.id as string & tags.Format<"uuid">,
      name: category.name,
      description: category.description as string | null,
      parent: null,
      subcategory_count: subcategoryCount,
    } satisfies IShoppingMallCategory.ISummary;
  });
  return {
    data,
    pagination: {
      current: 1,
      limit: total,
      records: total,
      pages: Math.ceil(total / total), // 1 page for all results
    } satisfies IPage.IPagination,
  };
}
