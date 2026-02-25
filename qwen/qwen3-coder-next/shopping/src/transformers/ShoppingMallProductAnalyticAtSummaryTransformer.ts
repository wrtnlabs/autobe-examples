import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductAnalyticAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        is_deleted: true,
        deleted_at: true,
        seller: {
          select: {
            id: true,
            shop_name: true,
          },
        } satisfies Prisma.shopping_mall_sellersFindFirstArgs,
        category: {
          select: {
            id: true,
            name: true,
          },
        } satisfies Prisma.shopping_mall_categoriesFindFirstArgs,
        productImages: {
          select: {
            image_url: true,
            sort_order: true,
          },
          orderBy: {
            sort_order: "asc",
          },
        } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
        reviews: {
          select: {
            rating: true,
          },
          where: {
            is_deleted: false,
          },
        } satisfies Prisma.shopping_mall_reviewsFindManyArgs,
        variants: {
          select: {
            price_override: true,
            stock_quantity: true,
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
        wishlists: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_customer_wishlistsFindManyArgs,
        wishlistItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_wishlist_itemsFindManyArgs,
        shoppingMallProductSnapshotsses: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs,
        productSnapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductAnalytic.ISummary> {
    // Compute price range from variants
    const prices = input.variants
      .map((v) => v.price_override ?? input.base_price)
      .filter((p) => p !== null && p !== undefined);
    const priceRange =
      prices.length > 0
        ? `${Math.min(...prices)} - ${Math.max(...prices)}`
        : `${input.base_price}`;
    // Compute review metrics from selected reviews
    const reviewCount = input.reviews.length;
    const averageRating =
      reviewCount > 0
        ? input.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : 0;
    // Get product thumbnail (first image ordered by sort_order)
    const productThumbnail =
      input.productImages.length > 0 ? input.productImages[0].image_url : "";
    // Aggregate stock quantity from variants
    const currentStock = input.variants.reduce(
      (sum, v) => sum + v.stock_quantity,
      0,
    );
    // Simulate computed metrics (would require separate aggregations in real implementation)
    const totalViews = 0;
    const uniqueViewers = 0;
    const salesUnits = 0;
    const revenue = 0;
    // Compute rates with proper null handling
    const viewToPurchaseConversion =
      totalViews > 0 ? (salesUnits / totalViews) * 100 : 0;
    const turnoverRate = currentStock > 0 ? salesUnits / currentStock : 0;
    return {
      product_id: input.id,
      product_name: input.name,
      product_thumbnail: productThumbnail,
      total_views: totalViews,
      unique_viewers: uniqueViewers,
      view_to_purchase_conversion: viewToPurchaseConversion,
      sales_units: salesUnits,
      revenue: revenue,
      current_stock: currentStock,
      turnover_rate: turnoverRate,
      average_rating: averageRating,
      review_count: reviewCount,
      price_range: priceRange,
      seller_id: input.seller.id,
      seller_name: input.seller.shop_name,
    };
  }
}
