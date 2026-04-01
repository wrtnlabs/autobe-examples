import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlistItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallWishlistItemSnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_wishlist_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_data: true,
        created_at: true,
        wishlistItem: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_wishlist_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallWishlistItemSnapshot.ISummary> {
    return {
      id: input.id,
      shopping_mall_wishlist_item_id: input.wishlistItem.id,
      snapshot_data: input.snapshot_data,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
