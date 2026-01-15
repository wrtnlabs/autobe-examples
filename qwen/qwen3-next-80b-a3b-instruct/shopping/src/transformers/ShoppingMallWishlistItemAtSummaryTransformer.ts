import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantAttributeSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttributeSummary";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";

export namespace ShoppingMallWishlistItemAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_wishlist_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        wishlist: {
          select: {
            id: true,
          },
        },
        productVariant: {
          select: {
            id: true,
            price: true,
            inventory_level: true,
            backorder_enabled: true,
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.shopping_mall_wishlist_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallWishlistItem.ISummary> {
    let variantPrice: number;
    let availabilityStatus: "available" | "low_stock" | "out_of_stock";
    const productVariant = input.productVariant;
    if (productVariant) {
      variantPrice = productVariant.price;
      if (productVariant.inventory_level > 0) {
        availabilityStatus =
          productVariant.inventory_level < 5 ? "low_stock" : "available";
      } else {
        availabilityStatus = "out_of_stock";
      }
    } else {
      // If no productVariant, this represents a data consistency error,
      // but we handle it as out_of_stock with price 0
      variantPrice = 0;
      availabilityStatus = "out_of_stock";
    }
    return {
      id: input.id,
      wishlist_id: input.wishlist.id,
      product_id: productVariant?.product?.id || "",
      product_variant_id: productVariant?.id ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      quantity: productVariant?.quantity ?? undefined,
      product: productVariant
        ? await ShoppingMallProductAtSummaryTransformer.transform(
            productVariant.product,
          )
        : undefined,
      product_variant: productVariant
        ? await ShoppingMallProductVariantAtSummaryTransformer.transform(
            productVariant,
          )
        : undefined,
      availability_status: availabilityStatus,
      price: variantPrice,
    };
  }
}
