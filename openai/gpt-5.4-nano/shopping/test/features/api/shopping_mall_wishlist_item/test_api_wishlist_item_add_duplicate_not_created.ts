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

export async function test_api_wishlist_item_add_duplicate_not_created(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member authorization
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2) Create wishlist
  const wishlist = await generate_random_shopping_mall_member_wishlists_create(
    memberConnection,
    {},
  );
  typia.assert(wishlist);
  // 3) Add a product to wishlist
  const firstItem =
    await generate_random_shopping_mall_member_wishlists_items_create_wishlist_item(
      memberConnection,
      {
        params: { wishlistId: wishlist.id },
      },
    );
  typia.assert(firstItem);
  const firstCreatedAt = firstItem.createdAt;
  TestValidator.equals("first item is active", firstItem.deletedAt, null);
  // 4) Duplicate add attempt (same wishlistId + same shopping_mall_product_id)
  const duplicateItem =
    await generate_random_shopping_mall_member_wishlists_items_create_wishlist_item(
      memberConnection,
      {
        params: { wishlistId: wishlist.id },
        body: {
          shopping_mall_product_id: firstItem.shoppingMallProductId,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(duplicateItem);
  // 5) Validate duplicate prevention
  TestValidator.equals(
    "wishlistId stable",
    duplicateItem.shoppingMallWishlistId,
    wishlist.id,
  );
  TestValidator.equals(
    "productId stable",
    duplicateItem.shoppingMallProductId,
    firstItem.shoppingMallProductId,
  );
  TestValidator.equals(
    "duplicate does not create active copy",
    duplicateItem.deletedAt,
    null,
  );
  TestValidator.equals(
    "createdAt unchanged on duplicate attempt",
    duplicateItem.createdAt,
    firstCreatedAt,
  );
  TestValidator.equals(
    "id matches existing item",
    duplicateItem.id,
    firstItem.id,
  );
}
