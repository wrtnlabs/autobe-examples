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
import { ShoppingMallCategoryAtSummaryTransformer } from "../transformers/ShoppingMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCategories(props: {
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "asc";
  const includeSubcategories = props.body.includeSubcategories ?? false;
  const skip = (page - 1) * limit;
  const orderByInput = (
    sortBy === "name"
      ? { name: sortOrder === "asc" ? "asc" : "desc" }
      : sortBy === "updatedAt"
        ? { updated_at: sortOrder === "asc" ? "asc" : "desc" }
        : { created_at: sortOrder === "asc" ? "asc" : "desc" }
  ) satisfies Prisma.shopping_mall_categoriesOrderByWithRelationInput;
  const whereInput: Prisma.shopping_mall_categoriesWhereInput = {
    deleted_at: null,
  };
  if (props.body.name !== undefined) {
    whereInput.name = {
      contains: props.body.name,
    };
  }
  if (props.body.parentId !== undefined) {
    if (props.body.parentId === null) {
      whereInput.parent_id = null;
    } else {
      whereInput.parent_id = props.body.parentId;
    }
  }
  let data: IShoppingMallCategory.ISummary[];
  let total: number;
  if (includeSubcategories) {
    const baseCategories =
      await MyGlobal.prisma.shopping_mall_categories.findMany({
        where: whereInput,
        orderBy: orderByInput,
        ...ShoppingMallCategoryAtSummaryTransformer.select(),
      });
    let combined = [...baseCategories];
    if (baseCategories.length > 0) {
      const baseIds = baseCategories.map((c) => c.id);
      const subcategories =
        await MyGlobal.prisma.shopping_mall_categories.findMany({
          where: {
            deleted_at: null,
            parent_id: { in: baseIds },
          },
          orderBy: orderByInput,
          ...ShoppingMallCategoryAtSummaryTransformer.select(),
        });
      const seen = new Set<string>();
      combined = [...baseCategories, ...subcategories].filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
      combined.sort((a, b) => {
        if (a.parent_id === null && b.parent_id !== null) return -1;
        if (a.parent_id !== null && b.parent_id === null) return 1;
        return 0;
      });
    }
    const paginated = combined.slice(skip, skip + limit);
    total = combined.length;
    data =
      await ShoppingMallCategoryAtSummaryTransformer.transformAll(paginated);
  } else {
    data = await ShoppingMallCategoryAtSummaryTransformer.transformAll(
      await MyGlobal.prisma.shopping_mall_categories.findMany({
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        ...ShoppingMallCategoryAtSummaryTransformer.select(),
      }),
    );
    total = await MyGlobal.prisma.shopping_mall_categories.count({
      where: whereInput,
    });
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  };
}
