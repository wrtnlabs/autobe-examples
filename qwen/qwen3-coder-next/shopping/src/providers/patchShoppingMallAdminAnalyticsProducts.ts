import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAnalytic";
import { IShoppingMallProductAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAnalyticsProducts(props: {
  admin: AdminPayload;
  body: IShoppingMallProductAnalytic.IRequest;
}): Promise<IPageIShoppingMallProductAnalytic.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE conditions for filtering
  const whereConditions: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
    ...(props.body.category_id && {
      category_id: props.body.category_id,
    }),
  };
  // Get total count for pagination
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereConditions,
  });
  // Fetch products with basic data only
  const data = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      props.body.sort === "newest"
        ? { created_at: "desc" as const }
        : props.body.sort === "price_asc"
          ? { base_price: "asc" as const }
          : props.body.sort === "price_desc"
            ? { base_price: "desc" as const }
            : { created_at: "desc" as const },
    select: {
      id: true,
      name: true,
      base_price: true,
      shopping_mall_seller_id: true,
      shopping_mall_category_id: true,
    },
  });
  // Transform to summary format with calculated metrics
  const results = await Promise.all(
    data.map(async (product) => {
      // Get seller info
      const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
        where: { id: product.shopping_mall_seller_id },
        select: { shop_name: true },
      });
      // Get category info
      const category =
        await MyGlobal.prisma.shopping_mall_categories.findUnique({
          where: { id: product.shopping_mall_category_id },
          select: { name: true },
        });
      // Get current stock
      const stockResult =
        await MyGlobal.prisma.shopping_mall_variant_stocks.findMany({
          where: {
            shopping_mall_product_variant_id: product.id,
          },
          select: {
            current_quantity: true,
          },
        });
      const currentStock = stockResult.reduce(
        (sum, s) => sum + s.current_quantity,
        0,
      );
      // Get reviews for average rating
      const reviewsResult =
        await MyGlobal.prisma.shopping_mall_reviews.findMany({
          where: {
            shopping_mall_product_id: product.id,
            deleted_at: null,
          },
          select: {
            rating: true,
          },
        });
      const avgRating =
        reviewsResult.length > 0
          ? reviewsResult.reduce((sum, r) => sum + r.rating, 0) /
            reviewsResult.length
          : 0;
      // Get order items for revenue calculation
      const orderItemsResult =
        await MyGlobal.prisma.shopping_mall_order_items.findMany({
          where: {
            shopping_mall_order_product_snapshot_id: product.id,
          },
          select: {
            quantity: true,
            unit_price: true,
          },
        });
      const salesUnits = orderItemsResult.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const revenue = orderItemsResult.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0,
      );
      // Get product views count
      const productViewResult =
        await MyGlobal.prisma.shopping_mall_product_views.findMany({
          where: {
            shopping_mall_product_id: product.id,
          },
          select: {
            id: true,
          },
        });
      const viewCount = productViewResult.length;
      // Get review count
      const reviewResult = await MyGlobal.prisma.shopping_mall_reviews.findMany(
        {
          where: {
            shopping_mall_product_id: product.id,
            deleted_at: null,
          },
          select: {
            id: true,
          },
        },
      );
      const reviewCount = reviewResult.length;
      // Build price range string
      const variantResult =
        await MyGlobal.prisma.shopping_mall_product_variants.findMany({
          where: {
            shopping_mall_product_id: product.id,
          },
          select: {
            price_override: true,
          },
        });
      const prices = variantResult.map((v) =>
        v.price_override !== null ? v.price_override : product.base_price,
      );
      const minPrice =
        prices.length > 0 ? Math.min(...prices) : product.base_price;
      const maxPrice =
        prices.length > 0 ? Math.max(...prices) : product.base_price;
      const priceRange =
        minPrice === maxPrice
          ? `${minPrice.toFixed(2)}`
          : `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}`;
      return {
        product_id: product.id,
        product_name: product.name,
        product_thumbnail: "", // thumbnail not available in current query
        total_views: viewCount,
        unique_viewers: viewCount,
        view_to_purchase_conversion: Number(
          (viewCount > 0 ? (salesUnits / viewCount) * 100 : 0).toFixed(2),
        ),
        sales_units: salesUnits,
        revenue: Number(revenue.toFixed(2)),
        current_stock: currentStock,
        turnover_rate: Number(
          (currentStock > 0 ? salesUnits / currentStock : 0).toFixed(4),
        ),
        average_rating: Number(avgRating.toFixed(2)),
        review_count: reviewCount,
        price_range: priceRange,
        seller_id: product.shopping_mall_seller_id,
        seller_name: seller?.shop_name ?? "",
      } satisfies IShoppingMallProductAnalytic.ISummary;
    }),
  );
  return {
    data: results,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
