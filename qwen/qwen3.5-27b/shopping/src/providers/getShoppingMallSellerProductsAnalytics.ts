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
  // 1. Total products count (unique products from order_items for this seller)
  const totalProductsResult =
    await MyGlobal.prisma.shopping_mall_order_items.groupBy({
      by: ["product_snapshot"],
      where: {
        shopping_mall_seller_id: sellerId,
        deleted_at: null,
      },
    });
  const totalProducts = totalProductsResult.length;
  // 2. Category distribution - extract from product_snapshot JSON
  const orderItemsWithCategory =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_seller_id: sellerId,
        deleted_at: null,
      },
      select: {
        product_snapshot: true,
      },
    });
  const categoryCountMap = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      count: number;
    }
  >();
  for (const item of orderItemsWithCategory) {
    try {
      const productSnapshot = JSON.parse(item.product_snapshot);
      const categoryId = productSnapshot.category_id;
      const categoryName = productSnapshot.category_name;
      if (categoryId && categoryName) {
        const existing = categoryCountMap.get(categoryId);
        if (existing) {
          existing.count += 1;
        } else {
          categoryCountMap.set(categoryId, {
            categoryId,
            categoryName,
            count: 1,
          });
        }
      }
    } catch {
      // Skip invalid JSON
    }
  }
  const categoryDistribution: IShoppingMallProductAnalyticCategoryDistribution[] =
    Array.from(categoryCountMap.values())
      .sort((a, b) => b.count - a.count)
      .map(({ categoryId, categoryName, count }) => ({
        categoryId: categoryId as string & tags.Format<"uuid">,
        categoryName,
        productCount: count,
      }));
  // 3. Average rating from reviews
  const averageRatingResult =
    await MyGlobal.prisma.shopping_mall_reviews.aggregate({
      _avg: {
        rating: true,
      },
      where: {
        deleted_at: null,
        orderItem: {
          shopping_mall_seller_id: sellerId,
          deleted_at: null,
        },
      },
    });
  const averageRating = averageRatingResult._avg.rating ?? null;
  // 4. Total reviews count
  const totalReviews = await MyGlobal.prisma.shopping_mall_reviews.count({
    where: {
      deleted_at: null,
      orderItem: {
        shopping_mall_seller_id: sellerId,
        deleted_at: null,
      },
    },
  });
  // 5. Total units sold (exclude pending orders)
  const unitsSoldResult =
    await MyGlobal.prisma.shopping_mall_order_items.aggregate({
      _sum: {
        quantity: true,
      },
      where: {
        shopping_mall_seller_id: sellerId,
        deleted_at: null,
        status: {
          not: "pending",
        },
      },
    });
  const totalUnitsSold = unitsSoldResult._sum.quantity ?? 0;
  // 6. Total revenue (quantity * price) - calculate from order_items
  const orderItemsForRevenue =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_seller_id: sellerId,
        deleted_at: null,
        status: {
          not: "pending",
        },
      },
      select: {
        quantity: true,
        price: true,
      },
    });
  const totalRevenue = orderItemsForRevenue.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  // 7. Out of stock count - cannot determine current stock without products/variants table
  // Return 0 as we cannot access current inventory data
  const outOfStockCount = 0;
  // 8. Suspended seller products count - for sellers viewing their own analytics, this is 0
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
