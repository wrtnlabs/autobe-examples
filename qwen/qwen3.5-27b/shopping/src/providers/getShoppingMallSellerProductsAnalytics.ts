import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAnalytic";
import { IShoppingMallProductAnalyticCategoryDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAnalyticCategoryDistribution";
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

export async function getShoppingMallSellerProductsAnalytics(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallProductAnalytic> {
  const sellerId = props.seller.id;
  // 1. Count total distinct products from order_items for this seller
  const productSnapshots =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_seller_id: sellerId,
        deleted_at: null,
      },
      select: {
        product_snapshot: true,
      },
    });
  const uniqueProducts = new Set(
    productSnapshots.map((item) => item.product_snapshot),
  );
  const totalProducts = uniqueProducts.size;
  // 2. Category distribution - cannot determine without products table, return empty
  const categoryDistribution: IShoppingMallProductAnalyticCategoryDistribution[] =
    [];
  // 3. Average rating from reviews for this seller's order items
  const averageRatingResult =
    await MyGlobal.prisma.shopping_mall_reviews.aggregate({
      _avg: { rating: true },
      where: {
        deleted_at: null,
        orderItem: {
          shopping_mall_seller_id: sellerId,
          deleted_at: null,
        },
      },
    });
  const averageRating: (number & tags.Minimum<1> & tags.Maximum<5>) | null =
    averageRatingResult._avg.rating ?? null;
  // 4. Total reviews count for this seller's products
  const totalReviews = await MyGlobal.prisma.shopping_mall_reviews.count({
    where: {
      deleted_at: null,
      orderItem: {
        shopping_mall_seller_id: sellerId,
        deleted_at: null,
      },
    },
  });
  // 5. Total units sold (sum of quantities, excluding pending orders)
  const unitsSoldResult =
    await MyGlobal.prisma.shopping_mall_order_items.aggregate({
      _sum: { quantity: true },
      where: {
        shopping_mall_seller_id: sellerId,
        deleted_at: null,
        status: { notIn: ["pending"] },
      },
    });
  const totalUnitsSold = unitsSoldResult._sum.quantity ?? 0;
  // 6. Total revenue calculation
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_seller_id: sellerId,
      deleted_at: null,
      status: { notIn: ["pending"] },
    },
    select: {
      quantity: true,
      price: true,
    },
  });
  const totalRevenue = orderItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  // 7. Out of stock count - cannot determine without product_variants table
  const outOfStockCount = 0;
  // 8. Suspended seller products count - N/A for seller viewing their own analytics
  const suspendedSellerProductsCount = 0;
  return {
    totalProducts,
    categoryDistribution,
    averageRating,
    totalReviews,
    totalUnitsSold,
    totalRevenue,
    outOfStockCount,
    suspendedSellerProductsCount,
  };
}
