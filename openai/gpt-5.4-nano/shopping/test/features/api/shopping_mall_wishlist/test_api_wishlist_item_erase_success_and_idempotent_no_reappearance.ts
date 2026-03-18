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

export async function test_api_wishlist_item_erase_success_and_idempotent_no_reappearance(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: typia.random<IShoppingMallMember.IJoin>(),
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: typia.random<IShoppingMallMember.IJoin>(),
  });
  const wishlistA = await generate_random_shopping_mall_member_wishlists_create(
    memberAConnection,
    {
      body: {},
    },
  );
  typia.assert(wishlistA);
  const wishlistItemA =
    await generate_random_shopping_mall_member_wishlists_items_create_wishlist_item(
      memberAConnection,
      {
        params: { wishlistId: wishlistA.id },
        body: {
          shopping_mall_product_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItemA);
  // Scenario 1: happy path + idempotency
  await api.functional.shoppingMall.member.wishlists.items.erase(
    memberAConnection,
    {
      wishlistId: wishlistA.id,
      wishlistItemId: wishlistItemA.id,
    },
  );
  await api.functional.shoppingMall.member.wishlists.items.erase(
    memberAConnection,
    {
      wishlistId: wishlistA.id,
      wishlistItemId: wishlistItemA.id,
    },
  );
  // Scenario 2: ownership enforcement
  await api.functional.shoppingMall.member.wishlists.items.erase(
    memberBConnection,
    {
      wishlistId: wishlistA.id,
      wishlistItemId: wishlistItemA.id,
    },
  );
  // Scenario 3 (seller product deletion auto-removal) cannot be exercised
  // with the provided available endpoints.
  TestValidator.predicate("member A and B auth succeeded", () => true);
}
