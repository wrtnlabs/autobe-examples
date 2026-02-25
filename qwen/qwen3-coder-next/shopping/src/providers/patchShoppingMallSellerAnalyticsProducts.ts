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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerAnalyticsProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereConditions: Prisma.shopping_mall_productsWhereInput = {
    shopping_mall_seller_id: props.seller.id,
    is_deleted: false,
  };
  // Add category filter if provided
  if (props.body.category_id !== undefined) {
    whereConditions.shopping_mall_category_id = props.body.category_id;
  }
  // Add price range filters
  if (
    props.body.min_price !== undefined ||
    props.body.max_price !== undefined
  ) {
    whereConditions.base_price = {};
    if (props.body.min_price !== undefined) {
      whereConditions.base_price.gte = props.body.min_price;
    }
    if (props.body.max_price !== undefined) {
      whereConditions.base_price.lte = props.body.max_price;
    }
  }
  // Get total count for pagination
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereConditions,
  });
  // Fetch products with basic data (without non-existent relations)
  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { id: "desc" },
    select: {
      id: true,
      name: true,
      base_price: true,
      is_deleted: true,
      shopping_mall_seller_id: true,
      shopping_mall_category_id: true,
    },
  });
  // Transform to response format
  const data = await ArrayUtil.asyncMap(products, async (product) => {
    // Fetch seller info
    const seller =
      await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
        where: { id: product.shopping_mall_seller_id },
      });
    // Fetch category info
    const category =
      await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
        where: { id: product.shopping_mall_category_id },
      });
    return {
      id: product.id,
      name: product.name,
      base_price: product.base_price,
      is_deleted: product.is_deleted,
      seller: {
        id: seller.id,
        shop_name: seller.shop_name,
        approval_status: seller.approval_status,
        created_at: seller.created_at.toISOString(),
      },
      category: {
        id: category.id,
        name: category.name,
        description: category.description ?? null,
        parent: null,
        subcategory_count: 0,
      },
      average_rating: 0,
      view_count: 0,
      conversion_rate: 0,
      total_stock: 0,
      inventory_turnover: 0,
      revenue: 0,
      days_since_creation: 0,
      order_count: 0,
    };
  });
  return {
    data,
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
  };
}
