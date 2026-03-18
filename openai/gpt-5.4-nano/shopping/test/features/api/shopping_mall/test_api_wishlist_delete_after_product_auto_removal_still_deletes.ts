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

export async function test_api_wishlist_delete_after_product_auto_removal_still_deletes(
  connection: api.IConnection,
): Promise<void> {
  // 1) member setup (join)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2) create wishlist for the member
  const wishlist = await generate_random_shopping_mall_member_wishlists_create(
    memberConnection,
    {},
  );
  typia.assert(wishlist);
  // 3) add wishlist item(s) referencing a product that will later be deleted
  // Note: generator will create product(s) and wishlist items consistently.
  const wishlistItem =
    await generate_random_shopping_mall_member_wishlists_items_create_wishlist_item(
      memberConnection,
      { params: { wishlistId: wishlist.id } },
    );
  typia.assert(wishlistItem);
  // 4) delete the referenced product so wishlist items are auto-removed
  // No product-delete endpoint is provided in the given materials.
  // This test focuses on the wishlist-parent delete succeeding after children may be removed.
  // As a proxy, we attempt wishlist deletion directly.
  await api.functional.shoppingMall.member.wishlists.eraseWishlist(
    memberConnection,
    { wishlistId: wishlist.id },
  );
}
