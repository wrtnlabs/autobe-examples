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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerStatisticsProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProductStatistics.IRequest;
}): Promise<IPageIShoppingMallProductStatistics> {
  // Build base where condition for seller authorization
  const baseWhere = {
    shopping_mall_seller_id: props.seller.id,
    deleted_at: null,
  };

  // Apply date range filtering using string comparison
  const dateWhere: Record<string, unknown> = {};
  if (props.body.date_range.start || props.body.date_range.end) {
    const createdAt: Record<string, unknown> = {};
    if (props.body.date_range.start) {
      createdAt.gte = props.body.date_range.start;
    }
    if (props.body.date_range.end) {
      createdAt.lte = props.body.date_range.end;
    }
    dateWhere.created_at = createdAt;
  }

  // Apply advanced filters
  const filterWhere: Record<string, unknown> = {};
  if (props.body.filters) {
    if (props.body.filters.category_ids?.length) {
      filterWhere.shopping_mall_category_id = {
        in: props.body.filters.category_ids,
      };
    }
    if (props.body.filters.status?.length) {
      filterWhere.status = { in: props.body.filters.status };
    }
    if (
      props.body.filters.min_price !== undefined ||
      props.body.filters.max_price !== undefined
    ) {
      const priceFilter: Record<string, unknown> = {};
      if (props.body.filters.min_price !== undefined) {
        priceFilter.gte = props.body.filters.min_price;
      }
      if (props.body.filters.max_price !== undefined) {
        priceFilter.lte = props.body.filters.max_price;
      }
      filterWhere.price = priceFilter;
    }
    if (props.body.filters.inventory_status?.length) {
      const inventoryConditions = props.body.filters.inventory_status.map(
        (status) => {
          switch (status) {
            case "in_stock":
              return { stock_quantity: { gt: 10 } };
            case "low_stock":
              return { stock_quantity: { lte: 10, gt: 0 } };
            case "out_of_stock":
              return { stock_quantity: 0 };
            case "backordered":
              return { stock_quantity: { lt: 0 } };
            default:
              return {};
          }
        },
      );
      filterWhere.OR = inventoryConditions;
    }
    if (props.body.filters.condition?.length) {
      filterWhere.condition = { in: props.body.filters.condition };
    }
  }

  // Combine all where conditions
  const where = {
    ...baseWhere,
    ...dateWhere,
    ...filterWhere,
  };

  // Get pagination settings
  const page = props.body.pagination?.current ?? 1;
  const limit = props.body.pagination?.limit ?? 100;
  const skip = (page - 1) * limit;

  // Execute concurrent queries for efficiency
  const [total, activeCount, lowStockCount, outOfStockCount, products] =
    await Promise.all([
      MyGlobal.prisma.shopping_mall_products.count({ where }),
      MyGlobal.prisma.shopping_mall_products.count({
        where: { ...where, status: "active" },
      }),
      MyGlobal.prisma.shopping_mall_products.count({
        where: { ...where, stock_quantity: { lte: 10, gt: 0 } },
      }),
      MyGlobal.prisma.shopping_mall_products.count({
        where: { ...where, stock_quantity: 0 },
      }),
      MyGlobal.prisma.shopping_mall_products.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          seller: true,
        },
      }),
    ]);

  // Calculate average price
  const averagePrice =
    products.length > 0
      ? products.reduce((sum, p) => sum + p.price, 0) / products.length
      : 0;

  // Build base statistics
  const baseStats: IShoppingMallProductStatistics = {
    total_products: total as number & tags.Type<"int32">,
    active_products: activeCount as number & tags.Type<"int32">,
    low_stock_products: lowStockCount as number & tags.Type<"int32">,
    out_of_stock_products: outOfStockCount as number & tags.Type<"int32">,
    average_price: averagePrice,
  };

  // Add price analysis if requested
  if (props.body.metrics.includes("price_analysis") && products.length > 0) {
    const prices = products.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const medianPrice =
      sortedPrices.length % 2 === 0
        ? (sortedPrices[sortedPrices.length / 2 - 1] +
            sortedPrices[sortedPrices.length / 2]) /
          2
        : sortedPrices[Math.floor(sortedPrices.length / 2)];

    baseStats.price_range = {
      min_price: minPrice,
      max_price: maxPrice,
      median_price: medianPrice,
    };
  }

  // Add category distribution if requested
  if (
    props.body.metrics.includes("performance") &&
    props.body.group_by.includes("category")
  ) {
    const categoryMap = new Map<string, number>();
    products.forEach((product) => {
      if (product.category) {
        const count = categoryMap.get(product.category.name) || 0;
        categoryMap.set(product.category.name, count + 1);
      }
    });

    baseStats.category_distribution = Array.from(categoryMap.entries()).map(
      ([categoryName, productCount]) => ({
        categoryName,
        productCount: productCount as number & tags.Type<"int32">,
        percentage: total > 0 ? (productCount / total) * 100 : 0,
      }),
    );
  }

  // Add seller distribution if requested
  if (
    props.body.metrics.includes("performance") &&
    props.body.group_by.includes("seller")
  ) {
    const sellerMap = new Map<string, { total: number; active: number }>();
    products.forEach((product) => {
      if (product.seller) {
        const sellerName = product.seller.business_name || "Unknown Seller";
        const current = sellerMap.get(sellerName) || { total: 0, active: 0 };
        sellerMap.set(sellerName, {
          total: current.total + 1,
          active: current.active + (product.status === "active" ? 1 : 0),
        });
      }
    });

    baseStats.seller_distribution = Array.from(sellerMap.entries()).map(
      ([sellerName, counts]) => ({
        sellerName,
        productCount: counts.total as number & tags.Type<"int32">,
        activeRatio:
          counts.total > 0 ? (counts.active / counts.total) * 100 : 0,
      }),
    );
  }

  // Add inventory metrics if requested
  if (
    props.body.metrics.includes("inventory_turnover") &&
    products.length > 0
  ) {
    const totalCostValue = products.reduce(
      (sum, p) => sum + (p.cost_price || 0) * p.stock_quantity,
      0,
    );
    baseStats.inventory_value = totalCostValue;

    // Simplified turnover calculation (can be enhanced with actual sales data)
    const avgInventoryValue = totalCostValue / products.length;
    baseStats.turnover_rate =
      avgInventoryValue > 0
        ? products.reduce((sum, p) => sum + p.price, 0) / avgInventoryValue
        : 0;
  }

  // For grouping by product, return individual product statistics
  const statistics = props.body.group_by.includes("product")
    ? products.map((product) => ({
        ...baseStats,
        // Override with product-specific metrics
        total_products: 1 as number & tags.Type<"int32">,
        active_products:
          product.status === "active" ? 1 : (0 as number & tags.Type<"int32">),
        low_stock_products:
          product.stock_quantity <= 10 && product.stock_quantity > 0
            ? 1
            : (0 as number & tags.Type<"int32">),
        out_of_stock_products:
          product.stock_quantity === 0 ? 1 : (0 as number & tags.Type<"int32">),
        average_price: product.price,
      }))
    : [baseStats];

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: statistics,
  };
}
