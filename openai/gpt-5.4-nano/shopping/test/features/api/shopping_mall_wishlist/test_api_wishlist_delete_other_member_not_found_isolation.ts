import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

export async function test_api_wishlist_delete_other_member_not_found_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAAuth);
  const wishlistA = await generate_random_shopping_mall_member_wishlists_create(
    memberAConnection,
    {
      body: {
        items: ArrayUtil.repeat(
          1,
          () =>
            ({
              shopping_mall_product_id: typia.random<
                string & tags.Format<"uuid">
              >(),
            }) satisfies IShoppingMallWishlistItem.ICreate,
        ),
      } satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlistA);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberBAuth);
  await TestValidator.httpError(
    "other member cannot delete wishlist (treated as not found)",
    [401, 403, 404],
    async () =>
      api.functional.shoppingMall.member.wishlists.eraseWishlist(
        memberBConnection,
        {
          wishlistId: wishlistA.id,
        },
      ),
  );
  // Verify isolation by ensuring member A can still delete its own wishlist.
  await api.functional.shoppingMall.member.wishlists.eraseWishlist(
    memberAConnection,
    {
      wishlistId: wishlistA.id,
    },
  );
  // After successful deletion by member A, a second deletion attempt by member A
  // should now fail (treated as not found), confirming the delete only happened
  // for the rightful owner.
  await TestValidator.httpError(
    "wishlist is deleted only after rightful owner's deletion",
    [401, 403, 404],
    async () =>
      api.functional.shoppingMall.member.wishlists.eraseWishlist(
        memberAConnection,
        {
          wishlistId: wishlistA.id,
        },
      ),
  );
}
