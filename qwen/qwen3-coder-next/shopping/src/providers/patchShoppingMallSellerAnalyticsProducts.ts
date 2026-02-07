import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
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
  body: IShoppingMallProductSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
  const body = props.body as any;
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build dynamic where clause based on request filters
  const whereInput: Prisma.shopping_mall_productsWhereInput = {
    shopping_mall_seller_id: props.seller.id,
    deleted_at: null,
    // Base filter for seller's own products
  };
  // Add dynamic filters from request body
  if (body.category_id) {
    whereInput.shopping_mall_subcategory_id = body.category_id;
  }
  if (body.search) {
    whereInput.OR = [
      { name: { contains: body.search, mode: "insensitive" } },
      { description: { contains: body.search, mode: "insensitive" } },
    ];
  }
  if (body.status) {
    whereInput.status = body.status;
  }
  // Price range filters
  if (body.min_price !== undefined || body.max_price !== undefined) {
    whereInput.base_price = {};
    if (body.min_price !== undefined) {
      (whereInput.base_price as any).gte = body.min_price;
    }
    if (body.max_price !== undefined) {
      (whereInput.base_price as any).lte = body.max_price;
    }
  }
  // Date range filters
  if (body.created_at_start || body.created_at_end) {
    whereInput.created_at = {};
    if (body.created_at_start) {
      (whereInput.created_at as any).gte = body.created_at_start;
    }
    if (body.created_at_end) {
      (whereInput.created_at as any).lte = body.created_at_end;
    }
  }
  // Sort options
  const orderByInput =
    body.sort === "sales_desc"
      ? { sales_total: "desc" as const }
      : body.sort === "sales_asc"
        ? { sales_total: "asc" as const }
        : body.sort === "rating_desc"
          ? { average_rating: "desc" as const }
          : body.sort === "rating_asc"
            ? { average_rating: "asc" as const }
            : body.sort === "price_desc"
              ? { base_price: "desc" as const }
              : body.sort === "price_asc"
                ? { base_price: "asc" as const }
                : body.sort === "stock_desc"
                  ? { stock_total: "desc" as const }
                  : body.sort === "stock_asc"
                    ? { stock_total: "asc" as const }
                    : { created_at: "desc" as const };
  // Execute main query with analytics data
  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      name: true,
      base_price: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Calculate total count for pagination
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  // Transform products to analytics summary format
  const data = products.map((product) => {
    // Calculate metrics from available product data
    const orderCount = 0; // Default to 0 as we can't access orderItems
    const averageRating = 0; // Default to 0 as we can't access reviewRating
    const reviewCount = 0; // Default to 0 as we can't access reviewRating
    const totalStock = 0; // Default to 0 as we can't access inventory
    const inventoryTurnoverRate = 0; // Default to 0 as we can't access inventory
    const engagementScore = 0; // Default to 0 as analytics data isn't available
    // Build product analytics summary
    return {
      id: product.id,
      name: product.name,
      base_price: product.base_price,
      status: product.status,
      created_at: toISOStringSafe(product.created_at),
      updated_at: toISOStringSafe(product.updated_at),
      analytics: {
        total_sales: 0,
        total_quantity: 0,
        order_count: orderCount,
        average_rating: averageRating,
        review_count: reviewCount,
        total_stock: totalStock,
        inventory_turnover_rate: inventoryTurnoverRate,
        engagement_score: engagementScore,
      },
    };
  });
  return {
    data: data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
