import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductStatistics";
import { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import { IShoppingMallProductFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductFilters";
import { IShoppingMallProductStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductStatus";
import { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import { IShoppingMallProductCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCondition";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductStatistics";
import { IShoppingMallProductPriceRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPriceRange";
import { IShoppingMallCategoryDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryDistribution";
import { IShoppingMallSellerDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDistribution";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminStatisticsProducts(props: {
  admin: AdminPayload;
  body: IShoppingMallProductStatistics.IRequest;
}): Promise<IPageIShoppingMallProductStatistics> {
  const { date_range, group_by, filters, metrics, pagination } = props.body;

  // Build base WHERE conditions with proper type assertion
  const whereConditions: Record<string, unknown> = {
    deleted_at: null,
  };

  // Apply date range filtering with proper ISO string handling
  if (date_range.start || date_range.end) {
    whereConditions.created_at = {} satisfies Record<string, unknown> as Record<
      string,
      unknown
    >;
    if (date_range.start) {
      (whereConditions.created_at as Record<string, unknown>).gte =
        date_range.start;
    }
    if (date_range.end) {
      (whereConditions.created_at as Record<string, unknown>).lte =
        date_range.end;
    }
  }

  // Apply filters
  if (filters) {
    if (filters.category_ids?.length) {
      whereConditions.shopping_mall_category_id = {
        in: filters.category_ids,
      };
    }

    if (filters.seller_ids?.length) {
      whereConditions.shopping_mall_seller_id = {
        in: filters.seller_ids,
      };
    }

    if (filters.status?.length) {
      whereConditions.status = {
        in: filters.status,
      };
    }

    if (filters.min_price !== undefined || filters.max_price !== undefined) {
      whereConditions.price = {} satisfies Record<string, unknown> as Record<
        string,
        unknown
      >;
      if (filters.min_price !== undefined) {
        (whereConditions.price as Record<string, unknown>).gte =
          filters.min_price;
      }
      if (filters.max_price !== undefined) {
        (whereConditions.price as Record<string, unknown>).lte =
          filters.max_price;
      }
    }

    if (filters.inventory_status?.length) {
      const inventoryConditions: Record<string, unknown>[] = [];

      filters.inventory_status.forEach((status) => {
        switch (status) {
          case "in_stock":
            inventoryConditions.push({ stock_quantity: { gt: 10 } });
            break;
          case "low_stock":
            inventoryConditions.push({
              AND: [
                { stock_quantity: { gt: 0 } },
                { stock_quantity: { lte: 10 } },
              ],
            });
            break;
          case "out_of_stock":
            inventoryConditions.push({ stock_quantity: { equals: 0 } });
            break;
          case "backordered":
            inventoryConditions.push({ stock_quantity: { lt: 0 } });
            break;
        }
      });

      if (inventoryConditions.length > 0) {
        whereConditions.OR = inventoryConditions;
      }
    }

    if (filters.condition?.length) {
      whereConditions.condition = {
        in: filters.condition,
      };
    }
  }

  // Handle pagination
  const page = pagination?.current ?? 1;
  const limit = pagination?.limit ?? 100;
  const skip = (page - 1) * limit;

  try {
    // Get overall statistics
    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      priceStats,
    ] = await Promise.all([
      MyGlobal.prisma.shopping_mall_products.count({ where: whereConditions }),
      MyGlobal.prisma.shopping_mall_products.count({
        where: {
          ...whereConditions,
          status: "active",
        },
      }),
      MyGlobal.prisma.shopping_mall_products.count({
        where: {
          ...whereConditions,
          stock_quantity: { gt: 0, lte: 10 },
        },
      }),
      MyGlobal.prisma.shopping_mall_products.count({
        where: {
          ...whereConditions,
          stock_quantity: { equals: 0 },
        },
      }),
      MyGlobal.prisma.shopping_mall_products.aggregate({
        where: {
          ...whereConditions,
          status: "active",
        },
        _avg: { price: true },
        _min: { price: true },
        _max: { price: true },
      }),
    ]);

    // Calculate additional metrics based on requested metrics
    const statistics: IShoppingMallProductStatistics = {
      total_products: totalProducts,
      active_products: activeProducts,
      low_stock_products: lowStockProducts,
      out_of_stock_products: outOfStockProducts,
      average_price: priceStats._avg.price ?? 0,
    };

    // Add price range if price analysis is requested
    if (
      metrics.includes("price_analysis") &&
      priceStats._min.price &&
      priceStats._max.price
    ) {
      statistics.price_range = {
        min_price: priceStats._min.price,
        max_price: priceStats._max.price,
        median_price: priceStats._avg.price ?? 0,
      };
    }

    // Handle grouping if specified
    if (group_by.length > 0) {
      const groupPromises = group_by.map((group) => {
        switch (group) {
          case "category":
            return MyGlobal.prisma.shopping_mall_products
              .groupBy({
                by: ["shopping_mall_category_id"],
                where: whereConditions,
                _count: { id: true },
                _sum: { stock_quantity: true },
              })
              .then(async (results) => {
                // Resolve category names
                const categoryIds = results.map(
                  (r) => r.shopping_mall_category_id,
                );
                const categories =
                  await MyGlobal.prisma.shopping_mall_categories.findMany({
                    where: { id: { in: categoryIds } },
                    select: { id: true, name: true },
                  });

                const categoryMap = new Map(
                  categories.map((c) => [c.id, c.name]),
                );

                return results.map((result) => ({
                  categoryName:
                    categoryMap.get(result.shopping_mall_category_id) ||
                    "Unknown",
                  productCount: result._count.id,
                  percentage:
                    totalProducts > 0
                      ? (result._count.id / totalProducts) * 100
                      : 0,
                }));
              });

          case "seller":
            return MyGlobal.prisma.shopping_mall_products
              .groupBy({
                by: ["shopping_mall_seller_id"],
                where: whereConditions,
                _count: { id: true },
              })
              .then(async (results) => {
                // Resolve seller names
                const sellerIds = results.map((r) => r.shopping_mall_seller_id);
                const sellers =
                  await MyGlobal.prisma.shopping_mall_sellers.findMany({
                    where: { id: { in: sellerIds } },
                    select: { id: true, business_name: true },
                  });

                const sellerMap = new Map(
                  sellers.map((s) => [s.id, s.business_name]),
                );

                return results.map((result) => ({
                  sellerName:
                    sellerMap.get(result.shopping_mall_seller_id) || "Unknown",
                  productCount: result._count.id,
                  activeRatio: 0, // Would need additional query for active products per seller
                }));
              });

          default:
            return Promise.resolve([]);
        }
      });

      const groupedResults = await Promise.all(groupPromises);

      // Add grouping results to statistics
      group_by.forEach((group, index) => {
        const results = groupedResults[index];
        if (results.length > 0) {
          if (group === "category") {
            statistics.category_distribution =
              results as IShoppingMallCategoryDistribution[];
          } else if (group === "seller") {
            statistics.seller_distribution =
              results as IShoppingMallSellerDistribution[];
          }
        }
      });
    }

    // For pagination, we return a single statistics object
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 1,
        pages: 1,
      },
      data: [statistics],
    };
  } catch (error) {
    throw new HttpException("Failed to retrieve product statistics", 500);
  }
}
