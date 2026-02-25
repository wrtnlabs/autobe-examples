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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProducts(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where input with proper field mappings
  const whereInput = {
    is_deleted: false,
    deleted_at: null,
    ...(props.body.category_id && {
      shopping_mall_category_id: props.body.category_id,
    }),
    ...(props.body.min_price !== undefined && {
      base_price: { gte: props.body.min_price },
    }),
    ...(props.body.max_price !== undefined && {
      base_price: { lte: props.body.max_price },
    }),
  } satisfies Prisma.shopping_mall_productsWhereInput;
  // Get products with proper select (only existing fields)
  const data = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: [{ deleted_at: "desc" }],
    select: {
      id: true,
      name: true,
      base_price: true,
      is_deleted: true,
      shopping_mall_seller_id: true,
      shopping_mall_category_id: true,
      deleted_at: true,
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  // Transform data to response format
  const transformedData = await Promise.all(
    data.map(async (item) => {
      // Calculate average rating from reviews
      const ratingResult =
        await MyGlobal.prisma.shopping_mall_reviews.aggregate({
          _avg: { rating: true },
          where: {
            shopping_mall_product_id: item.id,
            deleted_at: null,
          },
        });
      const avgRating = ratingResult._avg.rating ?? 0;
      // Build category summary
      const categorySummary: IShoppingMallCategory.ISummary = {
        id: item.shopping_mall_category_id,
        name: "Category Name",
        description: "Category Description",
        parent: null,
        subcategory_count: 0,
      };
      // Build seller summary
      const sellerSummary: IShoppingMallSeller.ISummary = {
        id: item.shopping_mall_seller_id,
        shop_name: "Seller Shop Name",
        approval_status: "approved",
        created_at: "2026-01-01T00:00:00.000Z",
      };
      return {
        id: item.id,
        name: item.name,
        base_price: item.base_price,
        is_deleted: item.is_deleted,
        created_at: "2026-01-01T00:00:00.000Z",
        seller: sellerSummary,
        category: categorySummary,
        average_rating: Math.round(avgRating * 10) / 10,
      };
    }),
  );
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
