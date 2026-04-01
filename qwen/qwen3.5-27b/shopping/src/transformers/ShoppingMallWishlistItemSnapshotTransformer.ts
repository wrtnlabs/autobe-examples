import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IShoppingMallWishlistItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallWishlistItemAtSummaryTransformer } from "./ShoppingMallWishlistItemAtSummaryTransformer";

export namespace ShoppingMallWishlistItemSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_wishlist_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_data: true,
        created_at: true,
        wishlistItem: ShoppingMallWishlistItemAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_wishlist_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallWishlistItemSnapshot> {
    return {
      id: input.id,
      wishlistItem:
        await ShoppingMallWishlistItemAtSummaryTransformer.transform(
          input.wishlistItem,
        ),
      snapshotData: input.snapshot_data,
      createdAt: input.created_at.toISOString(),
    };
  }
}
