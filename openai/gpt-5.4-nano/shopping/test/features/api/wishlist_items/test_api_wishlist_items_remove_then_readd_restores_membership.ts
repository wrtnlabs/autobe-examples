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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

export async function test_api_wishlist_items_remove_then_readd_restores_membership(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create member account (join)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  void memberAuth;
  // 2) Create an active product
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      memberConnection,
      {},
    );
  typia.assert(product);
  // 3) Create a wishlist and ensure the product is present initially
  const wishlist = await generate_random_shopping_mall_member_wishlists_create(
    memberConnection,
    {
      body: {
        items: [
          {
            shopping_mall_product_id: product.id,
          },
        ],
      },
    },
  );
  typia.assert(wishlist);
  const wishlistId = wishlist.id;
  // 4) Remove the product from the wishlist
  const removed =
    await api.functional.shoppingMall.member.wishlists.items.patch(
      memberConnection,
      {
        wishlistId,
        body: {
          items: [
            {
              shopping_mall_product_id: product.id,
            },
          ],
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(removed);
  TestValidator.predicate("wishlist item removed", removed.deletedAt !== null);
  TestValidator.equals(
    "removed wishlist id matches",
    removed.shoppingMallWishlistId,
    wishlistId,
  );
  TestValidator.equals(
    "removed product id matches",
    removed.shoppingMallProductId,
    product.id,
  );
  // 5) Re-add the same product back to the wishlist
  const readded =
    await api.functional.shoppingMall.member.wishlists.items.patch(
      memberConnection,
      {
        wishlistId,
        body: {
          items: [
            {
              shopping_mall_product_id: product.id,
            },
          ],
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(readded);
  TestValidator.equals(
    "readded wishlist id matches",
    readded.shoppingMallWishlistId,
    wishlistId,
  );
  TestValidator.equals(
    "readded product id matches",
    readded.shoppingMallProductId,
    product.id,
  );
  TestValidator.predicate(
    "wishlist item restored as active",
    readded.deletedAt === null,
  );
}
