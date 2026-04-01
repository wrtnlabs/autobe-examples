import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallWishlistItemAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_wishlist_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_customersFindManyArgs,
        product: {
          select: {
            id: true,
            name: true,
            deleted_at: true,
            base_price: true,
            variants: {
              select: {
                price_override: true,
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
    const variants = input.product.variants;
    const prices = variants
      .map((v) => (v.price_override !== null ? Number(v.price_override) : null))
      .filter((p): p is number => p !== null);
    const basePrice = Number(input.product.base_price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : basePrice;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : basePrice;
    return {
      id: input.id,
      product: {
        min: minPrice,
        max: maxPrice,
      } satisfies IShoppingMallProduct.ISummary,
      available: !input.product.deleted_at && input.product.variants.length > 0,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
