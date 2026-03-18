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

export async function test_api_wishlist_update_rejects_cross_wishlist_item_id(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member 1 joins
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Member 1 creates wishlist1
  const wishlist1 = await generate_random_shopping_mall_member_wishlists_create(
    member1Connection,
    {
      body: {},
    },
  );
  typia.assert(wishlist1);
  // 3) Member 1 creates a product
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      member1Connection,
      {},
    );
  typia.assert(product);
  // 4) Add product to wishlist1
  const wishlistItem1Before =
    await generate_random_shopping_mall_member_wishlists_items_create_wishlist_item(
      member1Connection,
      {
        params: { wishlistId: wishlist1.id },
        body: { shopping_mall_product_id: product.id },
      },
    );
  typia.assert(wishlistItem1Before);
  // 5) Member 2 joins
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 6) Member 2 creates wishlist2
  const wishlist2 = await generate_random_shopping_mall_member_wishlists_create(
    member2Connection,
    {
      body: {},
    },
  );
  typia.assert(wishlist2);
  // 7) Member 2 tries to update wishlistItem1 via wishlist2 URL
  await TestValidator.error(
    "reject cross-wishlist wishlist item update",
    async () => {
      await api.functional.shoppingMall.member.wishlists.items.updateWishlistItem(
        member2Connection,
        {
          wishlistId: wishlist2.id,
          wishlistItemId: wishlistItem1Before.id,
          body: {
            deletedAt: null,
          } satisfies IShoppingMallWishlistItem.IUpdate,
        },
      );
    },
  );
  // 9) As Member 1, successfully call PUT /wishlists/{wishlist1Id}/items/{wishlistItemId}
  const wishlistItem1After =
    await api.functional.shoppingMall.member.wishlists.items.updateWishlistItem(
      member1Connection,
      {
        wishlistId: wishlist1.id,
        wishlistItemId: wishlistItem1Before.id,
        body: {
          deletedAt: wishlistItem1Before.deletedAt,
        } satisfies IShoppingMallWishlistItem.IUpdate,
      },
    );
  typia.assert(wishlistItem1After);
  // 8) Verify stored data remains unchanged relative to pre-call state
  // Ignore updatedAt/createdAt since PUT may update timestamps.
  TestValidator.equals(
    "wishlist item data unchanged after cross-wishlist rejection",
    wishlistItem1After,
    wishlistItem1Before,
    (key) => key === "updatedAt" || key === "createdAt",
  );
  // Basic ownership consistency check
  TestValidator.equals(
    "wishlist item remains associated with original wishlist",
    wishlistItem1After.shoppingMallWishlistId,
    wishlistItem1Before.shoppingMallWishlistId,
  );
}
