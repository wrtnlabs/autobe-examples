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
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Resolve category IDs to include subcategories if categoryId is provided
  let categoryIds: string[] | undefined;
  if (body.categoryId != null) {
    const subcategories =
      await MyGlobal.prisma.shopping_mall_categories.findMany({
        where: { parent_id: body.categoryId },
        select: { id: true },
      });
    categoryIds = [body.categoryId, ...subcategories.map((c) => c.id)];
  }
  // Build sort direction
  const direction =
    body.sortDirection === "ASC" ? ("asc" as const) : ("desc" as const);
  // Build orderBy
  const orderByInput = (
    body.sort === "name"
      ? { name: direction }
      : body.sort === "basePrice"
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
    ...(body.keyword != null &&
      body.keyword.length > 0 && {
        name: { contains: body.keyword, mode: "insensitive" as const },
      }),
    ...(categoryIds != null && {
      shopping_mall_category_id: { in: categoryIds },
    }),
    ...(body.sellerId != null && {
      shopping_mall_seller_id: body.sellerId,
    }),
    ...((body.minPrice != null || body.maxPrice != null) && {
      base_price: {
        ...(body.minPrice != null && { gte: body.minPrice }),
        ...(body.maxPrice != null && { lte: body.maxPrice }),
      },
    }),
    ...((body.createdAfter != null || body.createdBefore != null) && {
      created_at: {
        ...(body.createdAfter != null && { gte: new Date(body.createdAfter) }),
        ...(body.createdBefore != null && {
          lte: new Date(body.createdBefore),
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
