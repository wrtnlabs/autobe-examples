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

export async function test_api_wishlist_item_get_success_and_visibility_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join (authenticate).
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallMember.IJoin,
    },
  );
  typia.assert(member);
  // 2) Create wishlist A.
  const wishlistA: IShoppingMallWishlist =
    await generate_random_shopping_mall_member_wishlists_create(
      memberConnection,
      {},
    );
  typia.assert(wishlistA);
  // 3) Add a product to wishlist A to obtain wishlistItemId A.
  const wishlistItemA: IShoppingMallWishlistItem =
    await generate_random_shopping_mall_member_wishlists_items_create_wishlist_item(
      memberConnection,
      {
        params: {
          wishlistId: wishlistA.id,
        },
      },
    );
  typia.assert(wishlistItemA);
  // 4) Call GET /shoppingMall/member/wishlists/{wishlistIdA}/items/{wishlistItemIdA}.
  const fetchedA: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.member.wishlists.items.at(
      memberConnection,
      {
        wishlistId: wishlistA.id,
        wishlistItemId: wishlistItemA.id,
      },
    );
  typia.assert(fetchedA);
  // Validate successful response includes expected identifiers/timestamps/product summary.
  TestValidator.equals(
    "wishlist item id matches",
    fetchedA.id,
    wishlistItemA.id,
  );
  TestValidator.equals(
    "shoppingMallWishlistId matches",
    fetchedA.shoppingMallWishlistId,
    wishlistA.id,
  );
  TestValidator.equals("deletedAt is null", fetchedA.deletedAt, null);
  TestValidator.equals(
    "product id matches",
    fetchedA.product.id,
    wishlistItemA.product.id,
  );
  // 5) Product deletion edge case (not-found after removal/unavailability).
  // We don't have product/seller deletion endpoints in provided SDK; validate the not-found contract
  // by requesting an arbitrary (unavailable) wishlistItemId within an otherwise valid wishlist scope.
  const randomUnavailableWishlistItemId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "unavailable wishlist item should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.member.wishlists.items.at(
        memberConnection,
        {
          wishlistId: wishlistA.id,
          wishlistItemId: randomUnavailableWishlistItemId,
        },
      );
    },
  );
  // Scenario 3 (scoping edge case): mismatched wishlistId + wishlistItemId.
  const wishlistB: IShoppingMallWishlist =
    await generate_random_shopping_mall_member_wishlists_create(
      memberConnection,
      {},
    );
  typia.assert(wishlistB);
  await TestValidator.httpError(
    "mismatched wishlistId should not reveal wishlist item",
    404,
    async () => {
      await api.functional.shoppingMall.member.wishlists.items.at(
        memberConnection,
        {
          wishlistId: wishlistB.id,
          wishlistItemId: wishlistItemA.id,
        },
      );
    },
  );
}
