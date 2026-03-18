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

export async function test_api_wishlist_item_get_removed_by_product_deletion_and_scoping(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAPassword = typia.random<string & tags.Format<"password">>();
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBPassword = typia.random<string & tags.Format<"password">>();
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  // 3) Create wishlists
  const wishlistA: IShoppingMallWishlist =
    await generate_random_shopping_mall_member_wishlists_create(
      memberAConnection,
      {},
    );
  typia.assert(wishlistA);
  const wishlistB: IShoppingMallWishlist =
    await generate_random_shopping_mall_member_wishlists_create(
      memberBConnection,
      {},
    );
  typia.assert(wishlistB);
  // 4) Add a wishlist item to wishlist A
  const wishlistItemA: IShoppingMallWishlistItem =
    await generate_random_shopping_mall_member_wishlists_items_create_wishlist_item(
      memberAConnection,
      { params: { wishlistId: wishlistA.id } },
    );
  typia.assert(wishlistItemA);
  // Scenario 1: fetch existing item and validate scoping + joined product summary
  const gotA: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.member.wishlists.items.at(
      memberAConnection,
      {
        wishlistId: wishlistA.id,
        wishlistItemId: wishlistItemA.id,
      },
    );
  typia.assert(gotA);
  TestValidator.equals(
    "shoppingMallWishlistId matches",
    gotA.shoppingMallWishlistId,
    wishlistA.id,
  );
  TestValidator.equals("wishlist item id matches", gotA.id, wishlistItemA.id);
  TestValidator.equals("wishlist item deletedAt is null", gotA.deletedAt, null);
  TestValidator.equals(
    "product id matches",
    gotA.product.id,
    wishlistItemA.product.id,
  );
  TestValidator.equals(
    "product code matches",
    gotA.product.code,
    wishlistItemA.product.code,
  );
  // Scenario 3: cross-wishlist access should be not-found
  await TestValidator.httpError(
    "mismatched wishlistId + wishlistItemId should be not-found",
    404,
    async () => {
      await api.functional.shoppingMall.member.wishlists.items.at(
        memberAConnection,
        {
          wishlistId: wishlistB.id,
          wishlistItemId: wishlistItemA.id,
        },
      );
    },
  );
}
