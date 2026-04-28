import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformCategoryAtSummaryTransformer } from "./EcommercePlatformCategoryAtSummaryTransformer";
import { EcommercePlatformSellerProfileAtSummaryTransformer } from "./EcommercePlatformSellerProfileAtSummaryTransformer";

export namespace EcommercePlatformProductAtSummaryTransformer {
  // 1. Payload type
  export type Payload = Prisma.ecommerce_platform_productsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function
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
        sellerProfile:
          EcommercePlatformSellerProfileAtSummaryTransformer.select(),
        category: EcommercePlatformCategoryAtSummaryTransformer.select(),
        images: {
          select: {
            uri: true,
            order_index: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_platform_product_imagesFindManyArgs,
        variants: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_platform_product_variantsFindManyArgs,
        reviews: {
          select: {
            rating: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_platform_reviewsFindManyArgs,
        wishlistItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_platform_wishlist_itemsFindManyArgs,
        snapshotProducts: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_platform_snapshot_productsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_platform_productsFindManyArgs;
  }
  // 3. transform() function
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformProduct.ISummary> {
    // Compute thumbnailUri: first active image sorted by order_index
    const activeImages = input.images
      .filter((img) => img.deleted_at === null)
      .sort((a, b) => a.order_index - b.order_index);
    const thumbnailUri: string | null =
      activeImages.length > 0 ? activeImages[0].uri : null;
    // Compute variantCount and isAvailable from variants
    const variantCount = input.variants.length;
    const isAvailable: "active" | "outOfStock" | "unavailable" =
      variantCount > 0 ? "active" : "unavailable";
    // Compute averageRating from non-deleted reviews
    const activeReviews = input.reviews.filter((r) => r.deleted_at === null);
    const averageRating: number | null =
      activeReviews.length > 0
        ? activeReviews.reduce((sum, r) => sum + r.rating, 0) /
          activeReviews.length
        : null;
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      basePrice: Number(input.base_price),
      createdAt: input.created_at.toISOString(),
      thumbnailUri,
      variantCount,
      isAvailable,
      averageRating,
      sellerProfile:
        await EcommercePlatformSellerProfileAtSummaryTransformer.transform(
          input.sellerProfile,
        ),
      category: await EcommercePlatformCategoryAtSummaryTransformer.transform(
        input.category,
      ),
    } satisfies IEcommercePlatformProduct.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformProductAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_platform_productsGetPayload<ReturnType<typeof select>>;
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
//             sellerProfile: EcommercePlatformSellerProfileAtSummaryTransformer.select(),
//             category: EcommercePlatformCategoryAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformProduct.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   basePrice: {number},
//   createdAt: {string},
//   thumbnailUri: {string | null},
//   variantCount: {integer},
//   isAvailable: {"active" | "outOfStock" | "unavailable"},
//   averageRating: {number | null},
//   sellerProfile: await EcommercePlatformSellerProfileAtSummaryTransformer.transform(input.sellerProfile),
//   category: await EcommercePlatformCategoryAtSummaryTransformer.transform(input.category),
//         };
//       }
//     }
//--------------------------------------------------------------