import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";
import { EcommerceMallProductImageTransformer } from "./EcommerceMallProductImageTransformer";
import { EcommerceMallProductVariantTransformer } from "./EcommerceMallProductVariantTransformer";
import { EcommerceMallSellerProfileAtSummaryTransformer } from "./EcommerceMallSellerProfileAtSummaryTransformer";

export namespace EcommerceMallProductTransformer {
  // 1. Payload type first
  export type Payload = Prisma.ecommerce_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: {
          select: {
            profile: EcommerceMallSellerProfileAtSummaryTransformer.select(),
          },
        },
        category: EcommerceMallCategoryAtSummaryTransformer.select(),
        productImages: EcommerceMallProductImageTransformer.select(),
        variants: EcommerceMallProductVariantTransformer.select(),
        reviews: {
          select: {
            rating: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs,
        productSnapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_product_snapshotsFindManyArgs,
        wishlistItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_wishlist_itemsFindManyArgs,
        orderItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProduct> {
    // Guard: seller profile must exist
    if (input.seller.profile === null) {
      throw new HttpException("Seller profile not found", 404);
    }
    // Filter active (non-deleted) variants
    const activeVariants = input.variants.filter((v) => !v.deleted_at);
    // Compute inStock: true if any active variant has quantity > 0
    const inStock = activeVariants.some((v) => v.quantity > 0);
    // Compute priceRange from active variants
    const variantPrices = activeVariants
      .map((v) => v.price)
      .filter((p): p is number => p !== null);
    let priceMin: number;
    let priceMax: number;
    if (variantPrices.length > 0) {
      priceMin = Math.min(...variantPrices);
      priceMax = Math.max(...variantPrices);
    } else {
      priceMin = Number(input.base_price);
      priceMax = Number(input.base_price);
    }
    // Compute rating statistics from non-deleted reviews
    const activeReviews = input.reviews.filter((r) => !r.deleted_at);
    const ratingCount = activeReviews.length;
    const ratingAverage =
      ratingCount > 0
        ? activeReviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount
        : null;
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      basePrice: Number(input.base_price),
      inStock,
      priceRange: {
        min: priceMin,
        max: priceMax,
      },
      ratingAverage,
      ratingCount: ratingCount,
      seller: await EcommerceMallSellerProfileAtSummaryTransformer.transform(
        input.seller.profile,
      ),
      category: await EcommerceMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      images: await ArrayUtil.asyncMap(
        input.productImages,
        EcommerceMallProductImageTransformer.transform,
      ),
      variants: await ArrayUtil.asyncMap(
        input.variants,
        EcommerceMallProductVariantTransformer.transform,
      ),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt:
        input.deleted_at !== null ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IEcommerceMallProduct;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductTransformer {
//       export type Payload = Prisma.ecommerce_mall_productsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             basePrice: true,
//             inStock: true,
//             ratingAverage: true,
//             ratingCount: true,
//             createdAt: true,
//             updatedAt: true,
//             deletedAt: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProduct> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   basePrice: {number},
//   inStock: {boolean},
//   priceRange: {object},
//   ratingAverage: {number | null},
//   ratingCount: {integer},
//   seller: {IEcommerceMallSellerProfile.ISummary},
//   category: {IEcommerceMallCategory.ISummary},
//   images: {Array<IEcommerceMallProductImage>},
//   variants: {Array<IEcommerceMallProductVariant>},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------