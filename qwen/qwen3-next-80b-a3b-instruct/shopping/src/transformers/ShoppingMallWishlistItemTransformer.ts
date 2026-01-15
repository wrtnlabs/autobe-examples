import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallWishlistItemTransformer {
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
          },
        },
      },
    } satisfies Prisma.shopping_mall_wishlist_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallWishlistItem> {
    return {
      id: input.id,
      productVariantId: input.productVariant.id,
      created_at: toISOStringSafe(input.created_at),
      notes: input.notes ?? undefined,
    };
  }
}
