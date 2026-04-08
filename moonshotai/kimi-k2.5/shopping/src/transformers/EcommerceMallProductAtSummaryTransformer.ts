import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallProductAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
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
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        category: EcommerceMallCategoryAtSummaryTransformer.select(),
        images: {
          select: {
            id: true,
            image_url: true,
            display_order: true,
          },
          orderBy: { display_order: "asc" },
        } satisfies Prisma.ecommerce_mall_product_imagesFindManyArgs,
        variants: {
          select: {
            id: true,
            price: true,
            inventoryRecords: {
              select: { quantity_change: true, reason: true },
            } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs,
          },
        } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs,
        reviews: {
          select: { rating: true },
        } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs,
        _count: { select: { reviews: true } },
      },
    } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProduct.ISummary> {
    const variantPrices = input.variants
      .map((v) => v.price ?? input.base_price)
      .filter((p) => p !== null);
    const minPrice =
      variantPrices.length > 0 ? Math.min(...variantPrices) : input.base_price;
    const maxPrice =
      variantPrices.length > 0 ? Math.max(...variantPrices) : input.base_price;
    const ratings = input.reviews.map((r) => r.rating);
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : null;
    const hasAvailableInventory = input.variants.some(
      (variant) =>
        variant.inventoryRecords.some(
          (inv) =>
            (inv.reason === "restock" && inv.quantity_change > 0) ||
            (inv.reason === "order_placed" && inv.quantity_change < 0),
        ) &&
        variant.inventoryRecords.reduce(
          (sum, inv) => sum + inv.quantity_change,
          0,
        ) > 0,
    );
    const availabilityStatus = hasAvailableInventory
      ? "available"
      : "unavailable";
    const thumbnailImage =
      input.images.length > 0 ? input.images[0].image_url : undefined;
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      basePrice: input.base_price,
      thumbnailImage,
      priceRange: { minPrice, maxPrice },
      category: await EcommerceMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      averageRating,
      reviewCount: input._count.reviews,
      availabilityStatus,
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
//             seller: EcommerceMallSellerAtSummaryTransformer.select(),
//             category: EcommerceMallCategoryAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallProduct.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   basePrice: {number},
//   thumbnailImage: {string | null},
//   priceRange: {IEcommerceMallProduct.IPriceRange},
//   category: await EcommerceMallCategoryAtSummaryTransformer.transform(input.category),
//   seller: await EcommerceMallSellerAtSummaryTransformer.transform(input.seller),
//   averageRating: {number | null},
//   reviewCount: {integer},
//   availabilityStatus: {"available" | "unavailable"},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------