import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";

export namespace EcommerceMallProductAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        // Scalars
        id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        // BelongsTo: category with nested transformer
        category: EcommerceMallCategoryAtSummaryTransformer.select(),
        // BelongsTo: seller with nested profile for shopName
        seller: {
          select: {
            id: true,
            profile: {
              select: {
                id: true,
                name: true,
              },
            } satisfies Prisma.ecommerce_mall_seller_profilesFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
        // HasMany: productImages for thumbnail
        productImages: {
          select: {
            id: true,
            image_url: true,
            display_order: true,
          },
          orderBy: {
            display_order: "asc",
          },
        } satisfies Prisma.ecommerce_mall_product_imagesFindManyArgs,
        // HasMany: variants for price range and stock
        variants: {
          select: {
            id: true,
            price: true,
            quantity: true,
          },
        } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
        // HasMany: reviews for rating statistics
        reviews: {
          select: {
            id: true,
            rating: true,
          },
        } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs,
        // Required schema fields (not used in DTO)
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
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProduct.ISummary> {
    // Thumbnail: first image by display_order
    const thumbnailUrl = input.productImages[0]?.image_url ?? "";
    // Variant price range: filter null prices, fallback to base_price
    const variantPrices = input.variants
      .map((v) => v.price)
      .filter((p): p is number => p !== null);
    const minVariantPrice =
      variantPrices.length > 0
        ? Math.min(...variantPrices)
        : Number(input.base_price);
    const maxVariantPrice =
      variantPrices.length > 0
        ? Math.max(...variantPrices)
        : Number(input.base_price);
    // Has stock: any variant with quantity > 0
    const hasStock = input.variants.some((v) => v.quantity > 0);
    // Average rating: compute from reviews array
    const reviewsCount = input.reviews.length;
    const averageRating =
      reviewsCount > 0
        ? input.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount
        : 0;
    // Shop name: from seller profile
    const shopName = input.seller.profile?.name ?? "";
    return {
      id: input.id,
      name: input.name,
      basePrice: Number(input.base_price),
      category: await EcommerceMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      thumbnailUrl: thumbnailUrl as string & import("typia").tags.Format<"uri">,
      minVariantPrice,
      maxVariantPrice,
      hasStock,
      shopName,
      averageRating: averageRating as number &
        import("typia").tags.Minimum<0> &
        import("typia").tags.Maximum<5>,
      reviewsCount: reviewsCount as number &
        import("typia").tags.Type<"int32"> &
        import("typia").tags.Minimum<0>,
      createdAt: input.created_at.toISOString(),
    } satisfies IEcommerceMallProduct.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallProductAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_productsGetPayload<ReturnType<typeof select>>;
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
//             ecommerce_mall_seller_id: true,
//             category: EcommerceMallCategoryAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProduct.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   basePrice: {number},
//   category: await EcommerceMallCategoryAtSummaryTransformer.transform(input.category),
//   thumbnailUrl: {string},
//   minVariantPrice: {number},
//   maxVariantPrice: {number},
//   hasStock: {boolean},
//   shopName: {string},
//   averageRating: {number},
//   reviewsCount: {integer},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------