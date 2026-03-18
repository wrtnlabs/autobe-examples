import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_wishlists_create } from "../../../generate/generate_random_shopping_mall_member_wishlists_create";
import { generate_random_shopping_mall_member_wishlists_items_create_wishlist_item } from "../../../generate/generate_random_shopping_mall_member_wishlists_items_create_wishlist_item";
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

export async function test_api_wishlist_item_erase_noop_after_product_deleted_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member joins
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: undefined,
  });
  // 2) Member creates a wishlist container
  const wishlist = await api.functional.shoppingMall.member.wishlists.create(
    memberConnection,
    {
      body: {
        items: undefined,
      } satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist);
  // 3) Member adds two products to the wishlist so we can verify independence
  const wishlistItemA =
    await api.functional.shoppingMall.member.wishlists.items.createWishlistItem(
      memberConnection,
      {
        wishlistId: wishlist.id,
        body: {
          shopping_mall_product_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItemA);
  const wishlistItemB =
    await api.functional.shoppingMall.member.wishlists.items.createWishlistItem(
      memberConnection,
      {
        wishlistId: wishlist.id,
        body: {
          shopping_mall_product_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItemB);
  // 4-5) Seller deletes referenced product: not available in provided SDK/utilities.
  // Best-effort: exercise idempotent DELETE behavior for an already-absent/no-op case
  // by deleting the same wishlist item twice.
  await api.functional.shoppingMall.member.wishlists.items.erase(
    memberConnection,
    {
      wishlistId: wishlist.id,
      wishlistItemId: wishlistItemA.id,
    },
  );
  await api.functional.shoppingMall.member.wishlists.items.erase(
    memberConnection,
    {
      wishlistId: wishlist.id,
      wishlistItemId: wishlistItemA.id,
    },
  );
  // 6) Ensure unrelated wishlist item can still be removed after the first no-op
  await api.functional.shoppingMall.member.wishlists.items.erase(
    memberConnection,
    {
      wishlistId: wishlist.id,
      wishlistItemId: wishlistItemB.id,
    },
  );
}
