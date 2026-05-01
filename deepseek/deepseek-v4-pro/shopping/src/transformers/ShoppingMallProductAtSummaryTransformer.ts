import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallProductAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        base_price: true,
        created_at: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        images: {
          select: {
            image_url: true,
          },
          orderBy: { display_order: "asc" as const },
          take: 1,
        } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
        variants: {
          select: {
            price: true,
            deleted_at: true,
            inventoryRecords: {
              select: {
                quantity_change: true,
              },
            },
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
        reviews: {
          select: {
            rating: true,
            deleted_at: true,
          },
        } satisfies Prisma.shopping_mall_review_reviewsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProduct.ISummary> {
    // --- Computed: variant prices and purchasability ---
    const nonDeletedVariants = input.variants.filter(
      (v) => v.deleted_at === null,
    );
    const effectivePrices = nonDeletedVariants.map(
      (v) => v.price ?? input.base_price,
    );
    const minVariantPrice =
      effectivePrices.length > 0 ? Math.min(...effectivePrices) : null;
    const maxVariantPrice =
      effectivePrices.length > 0 ? Math.max(...effectivePrices) : null;
    const isPurchasable = nonDeletedVariants.some((v) => {
      const totalStock = v.inventoryRecords.reduce(
        (sum, r) => sum + r.quantity_change,
        0,
      );
      return totalStock > 0;
    });
    // --- Computed: review statistics ---
    const nonDeletedReviews = input.reviews.filter(
      (r) => r.deleted_at === null,
    );
    const reviewCount = nonDeletedReviews.length;
    const averageRating =
      reviewCount > 0
        ? nonDeletedReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : null;
    // --- Computed: thumbnail image ---
    const thumbnailImageUrl =
      input.images.length > 0 ? input.images[0].image_url : null;
    return {
      id: input.id,
      name: input.name,
      base_price: input.base_price,
      thumbnail_image_url: thumbnailImageUrl,
      min_variant_price: minVariantPrice,
      max_variant_price: maxVariantPrice,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      average_rating: averageRating,
      review_count: reviewCount,
      is_purchasable: isPurchasable,
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallProductAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_productsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             base_price: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             seller: ShoppingMallSellerAtSummaryTransformer.select(),
//             shopping_mall_category_id: true,
//           },
//         } satisfies Prisma.shopping_mall_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProduct.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   base_price: {number},
//   thumbnail_image_url: {string | null},
//   min_variant_price: {number | null},
//   max_variant_price: {number | null},
//   seller: await ShoppingMallSellerAtSummaryTransformer.transform(input.seller),
//   average_rating: {number | null},
//   review_count: {integer},
//   is_purchasable: {boolean},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------