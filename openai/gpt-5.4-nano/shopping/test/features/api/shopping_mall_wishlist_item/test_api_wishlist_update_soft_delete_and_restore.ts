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
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { generate_random_shopping_mall_member_wishlists_create } from "../../../generate/generate_random_shopping_mall_member_wishlists_create";
import { generate_random_shopping_mall_member_wishlists_items_create_wishlist_item } from "../../../generate/generate_random_shopping_mall_member_wishlists_items_create_wishlist_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

export async function test_api_wishlist_update_soft_delete_and_restore(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const authedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${member.token.access}`,
    },
  };
  const wishlist = await generate_random_shopping_mall_member_wishlists_create(
    authedConnection,
    {},
  );
  typia.assert(wishlist);
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      authedConnection,
      {},
    );
  typia.assert(product);
  const wishlistItem =
    await generate_random_shopping_mall_member_wishlists_items_create_wishlist_item(
      authedConnection,
      {
        params: { wishlistId: wishlist.id },
        body: {
          shopping_mall_product_id: product.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem);
  const wishlistItemId = wishlistItem.id;
  const deletedAtTimestamp = new Date().toISOString();
  const updatedAfterDelete =
    await api.functional.shoppingMall.member.wishlists.items.updateWishlistItem(
      authedConnection,
      {
        wishlistId: wishlist.id,
        wishlistItemId,
        body: {
          deletedAt: deletedAtTimestamp,
        } satisfies IShoppingMallWishlistItem.IUpdate,
      },
    );
  typia.assert(updatedAfterDelete);
  TestValidator.equals(
    "wishlist item id should match",
    updatedAfterDelete.id,
    wishlistItemId,
  );
  TestValidator.predicate(
    "deletedAt should be non-null after soft delete",
    updatedAfterDelete.deletedAt !== null,
  );
  TestValidator.equals(
    "shoppingMallWishlistId should remain consistent",
    updatedAfterDelete.shoppingMallWishlistId,
    wishlist.id,
  );
  TestValidator.equals(
    "shoppingMallProductId should remain consistent",
    updatedAfterDelete.shoppingMallProductId,
    product.id,
  );
  const updatedAfterRestore =
    await api.functional.shoppingMall.member.wishlists.items.updateWishlistItem(
      authedConnection,
      {
        wishlistId: wishlist.id,
        wishlistItemId,
        body: {
          deletedAt: null,
        } satisfies IShoppingMallWishlistItem.IUpdate,
      },
    );
  typia.assert(updatedAfterRestore);
  TestValidator.equals(
    "wishlist item id should still match after restore",
    updatedAfterRestore.id,
    wishlistItemId,
  );
  TestValidator.equals(
    "deletedAt should be null after restore",
    updatedAfterRestore.deletedAt,
    null,
  );
  TestValidator.equals(
    "shoppingMallWishlistId should remain consistent after restore",
    updatedAfterRestore.shoppingMallWishlistId,
    wishlist.id,
  );
  TestValidator.equals(
    "shoppingMallProductId should remain consistent after restore",
    updatedAfterRestore.shoppingMallProductId,
    product.id,
  );
}
