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
  // Build base where clause
  const baseWhereInput: Prisma.shopping_mall_categoriesWhereInput = {
    deleted_at: null,
  };
  if (props.body.name) {
    baseWhereInput.name = {
      contains: props.body.name,
    };
  }
  // Build order by
  const orderByInput =
    sortBy === "name"
      ? { name: sortOrder as "asc" | "desc" }
      : sortBy === "updatedAt"
        ? { updated_at: sortOrder as "asc" | "desc" }
        : { created_at: sortOrder as "asc" | "desc" };
  let categories: Prisma.shopping_mall_categoriesGetPayload<
    ReturnType<typeof ShoppingMallCategoryAtSummaryTransformer.select>
  >[];
  let total: number;
  if (includeSubcategories && props.body.parentId) {
    // Get parent categories matching criteria
    const parentWhere: Prisma.shopping_mall_categoriesWhereInput = {
      ...baseWhereInput,
      id: props.body.parentId,
    };
    const parentCategories =
      await MyGlobal.prisma.shopping_mall_categories.findMany({
        where: parentWhere,
        orderBy: orderByInput,
        ...ShoppingMallCategoryAtSummaryTransformer.select(),
      });
    // Get subcategories of the parent
    const subcategoryWhere: Prisma.shopping_mall_categoriesWhereInput = {
      deleted_at: null,
      parent_id: props.body.parentId,
    };
    if (props.body.name) {
      subcategoryWhere.name = {
        contains: props.body.name,
      };
    }
    const subcategories =
      await MyGlobal.prisma.shopping_mall_categories.findMany({
        where: subcategoryWhere,
        orderBy: orderByInput,
        ...ShoppingMallCategoryAtSummaryTransformer.select(),
      });
    // Combine and apply pagination manually
    const allCategories = [...parentCategories, ...subcategories];
    const skip = (page - 1) * limit;
    categories = allCategories.slice(skip, skip + limit);
    total = allCategories.length;
  } else {
    // Standard pagination query
    const whereInput: Prisma.shopping_mall_categoriesWhereInput = {
      ...baseWhereInput,
    };
    if (props.body.parentId !== undefined) {
      whereInput.parent_id = props.body.parentId;
    }
    const skip = (page - 1) * limit;
    categories = await MyGlobal.prisma.shopping_mall_categories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallCategoryAtSummaryTransformer.select(),
    });
    total = await MyGlobal.prisma.shopping_mall_categories.count({
      where: whereInput,
    });
  }
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    categories,
    ShoppingMallCategoryAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformed,
  };
}
