import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductAtSummaryTransformer } from "../transformers/ShoppingMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProducts(props: {
  query: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const { query } = props;
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;
  // Resolve category IDs to include subcategories if categoryId is provided
  let categoryIds: string[] | undefined;
  if (query.categoryId != null) {
    const subcategories =
      await MyGlobal.prisma.shopping_mall_categories.findMany({
        where: { parent_id: query.categoryId },
        select: { id: true },
      });
    categoryIds = [query.categoryId, ...subcategories.map((c) => c.id)];
  }
  // Build sort direction
  const direction =
    query.sortDirection === "ASC" ? ("asc" as const) : ("desc" as const);
  // Build orderBy
  const orderByInput = (
    query.sort === "name"
      ? { name: direction }
      : query.sort === "basePrice"
        ? { base_price: direction }
        : { created_at: direction }
  ) satisfies Prisma.shopping_mall_productsOrderByWithRelationInput;
  // Build where clause
  const whereInput = {
    deleted_at: null,
    seller: {
      is_suspended: false,
      is_banned: false,
      deleted_at: null,
    },
    ...(query.keyword != null &&
      query.keyword.length > 0 && {
        name: { contains: query.keyword, mode: "insensitive" as const },
      }),
    ...(categoryIds != null && {
      shopping_mall_category_id: { in: categoryIds },
    }),
    ...(query.sellerId != null && {
      shopping_mall_seller_id: query.sellerId,
    }),
    ...((query.minPrice != null || query.maxPrice != null) && {
      base_price: {
        ...(query.minPrice != null && { gte: query.minPrice }),
        ...(query.maxPrice != null && { lte: query.maxPrice }),
      },
    }),
    ...((query.createdAfter != null || query.createdBefore != null) && {
      created_at: {
        ...(query.createdAfter != null && { gte: new Date(query.createdAfter) }),
        ...(query.createdBefore != null && {
          lte: new Date(query.createdBefore),
        }),
      },
    }),
  } satisfies Prisma.shopping_mall_productsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductAtSummaryTransformer.transform,
    ),
  };
}
