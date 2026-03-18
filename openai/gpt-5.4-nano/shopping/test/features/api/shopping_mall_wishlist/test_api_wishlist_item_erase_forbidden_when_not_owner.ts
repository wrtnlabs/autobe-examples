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

export async function test_api_wishlist_item_erase_forbidden_when_not_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberACreds = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberACreds);
  // 2) Member A creates wishlist and adds item
  const wishlistA = await generate_random_shopping_mall_member_wishlists_create(
    memberAConnection,
    {},
  );
  typia.assert(wishlistA);
  const wishlistItemA =
    await generate_random_shopping_mall_member_wishlists_items_create_wishlist_item(
      memberAConnection,
      {
        params: { wishlistId: wishlistA.id },
      },
    );
  typia.assert(wishlistItemA);
  const wishlistIdA = wishlistA.id;
  const wishlistItemIdA = wishlistItemA.id;
  // 3) Baseline verification: Member A can read it
  const baseline = await api.functional.shoppingMall.member.wishlists.items.at(
    memberAConnection,
    {
      wishlistId: wishlistIdA,
      wishlistItemId: wishlistItemIdA,
    },
  );
  typia.assert(baseline);
  TestValidator.equals(
    "wishlist item id matches",
    baseline.id,
    wishlistItemIdA,
  );
  // 4) Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBCreds = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberBCreds);
  // 5-7) Forbidden deletion by non-owner; verify item still exists
  await TestValidator.httpError(
    "non-owner cannot erase wishlist item",
    [401, 403, 404],
    async () => {
      await api.functional.shoppingMall.member.wishlists.items.erase(
        memberBConnection,
        {
          wishlistId: wishlistIdA,
          wishlistItemId: wishlistItemIdA,
        },
      );
    },
  );
  const stillExistsAfterForbidden =
    await api.functional.shoppingMall.member.wishlists.items.at(
      memberAConnection,
      {
        wishlistId: wishlistIdA,
        wishlistItemId: wishlistItemIdA,
      },
    );
  typia.assert(stillExistsAfterForbidden);
  TestValidator.equals(
    "still exists after forbidden attempt",
    stillExistsAfterForbidden.id,
    wishlistItemIdA,
  );
  // 8-11) Owner deletes + idempotent repeat
  await api.functional.shoppingMall.member.wishlists.items.erase(
    memberAConnection,
    {
      wishlistId: wishlistIdA,
      wishlistItemId: wishlistItemIdA,
    },
  );
  await TestValidator.httpError(
    "item is absent after owner erases",
    [404],
    async () => {
      await api.functional.shoppingMall.member.wishlists.items.at(
        memberAConnection,
        {
          wishlistId: wishlistIdA,
          wishlistItemId: wishlistItemIdA,
        },
      );
    },
  );
  await api.functional.shoppingMall.member.wishlists.items.erase(
    memberAConnection,
    {
      wishlistId: wishlistIdA,
      wishlistItemId: wishlistItemIdA,
    },
  );
  await TestValidator.httpError(
    "second delete remains idempotent (still absent)",
    [404],
    async () => {
      await api.functional.shoppingMall.member.wishlists.items.at(
        memberAConnection,
        {
          wishlistId: wishlistIdA,
          wishlistItemId: wishlistItemIdA,
        },
      );
    },
  );
}
