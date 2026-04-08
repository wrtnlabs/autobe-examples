import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformCategoryAtSummaryTransformer } from "./MallPlatformCategoryAtSummaryTransformer";
import { MallPlatformProductImageAtSummaryTransformer } from "./MallPlatformProductImageAtSummaryTransformer";
import { MallPlatformSellerAtSummaryTransformer } from "./MallPlatformSellerAtSummaryTransformer";

export namespace MallPlatformProductAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_productsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformProduct.ISummary> {
    const activeVariants = input.variants.filter(
      (variant) => variant.deleted_at === null && variant.is_active,
    );
    const effectivePrices = [
      input.base_price,
      ...activeVariants.map(
        (variant) => variant.price_override ?? input.base_price,
      ),
    ];
    const activeReviews = input.reviews.filter(
      (review) => review.deleted_at === null,
    );
    const firstImage =
      [...input.images].sort((a, b) => a.sort_order - b.sort_order)[0] ?? null;
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      basePrice: input.base_price,
      sellerAccount: await MallPlatformSellerAtSummaryTransformer.transform(
        input.sellerAccount,
      ),
      category:
        input.category === null
          ? null
          : await MallPlatformCategoryAtSummaryTransformer.transform(
              input.category,
            ),
      mainImage:
        firstImage === null
          ? null
          : await MallPlatformProductImageAtSummaryTransformer.transform(
              firstImage,
            ),
      priceMin: Math.min(...effectivePrices),
      priceMax: Math.max(...effectivePrices),
      availableVariantCount: activeVariants.length,
      reviewCount: activeReviews.length,
      averageRating:
        activeReviews.length === 0
          ? null
          : activeReviews.reduce((sum, review) => sum + review.rating, 0) /
            activeReviews.length,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformProduct.ISummary;
  }
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
        sellerAccount: MallPlatformSellerAtSummaryTransformer.select(),
        category: MallPlatformCategoryAtSummaryTransformer.select(),
        images: MallPlatformProductImageAtSummaryTransformer.select(),
        variants: {
          select: {
            id: true,
            price_override: true,
            is_active: true,
            deleted_at: true,
          },
        },
        productImageSnapshots: {
          select: {},
        },
        variantSnapshots: {
          select: {},
        },
        wishlistItems: {
          select: {},
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            deleted_at: true,
          },
        },
        snapshots: {
          select: {},
        },
      },
    } satisfies Prisma.mall_platform_productsFindManyArgs;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformProductAtSummaryTransformer {
//       export type Payload = Prisma.mall_platform_productsGetPayload<ReturnType<typeof select>>;
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
//             seller_account_id: true,
//             category: MallPlatformCategoryAtSummaryTransformer.select(),
//             images: MallPlatformProductImageAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.mall_platform_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformProduct.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   basePrice: {number},
//   sellerAccount: {IMallPlatformSeller.ISummary},
//   category: input.category ? await MallPlatformCategoryAtSummaryTransformer.transform(input.category) : null,
//   mainImage: input.images ? await MallPlatformProductImageAtSummaryTransformer.transform(input.images) : null,
//   priceMin: {number},
//   priceMax: {number},
//   availableVariantCount: {integer},
//   reviewCount: {integer},
//   averageRating: {number | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------