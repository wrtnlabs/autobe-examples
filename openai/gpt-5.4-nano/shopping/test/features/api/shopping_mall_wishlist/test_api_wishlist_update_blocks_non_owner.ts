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

export async function test_api_wishlist_update_blocks_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins (creates account and authenticates)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberACreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallMember.IJoin;
  const authorizedA = await authorize_member_join(memberAConnection, {
    body: memberACreds,
  });
  typia.assert(authorizedA);
  // 2) Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallMember.IJoin;
  const authorizedB = await authorize_member_join(memberBConnection, {
    body: memberBCreds,
  });
  typia.assert(authorizedB);
  // 3) Member A creates a wishlist
  const wishlistA = await generate_random_shopping_mall_member_wishlists_create(
    memberAConnection,
    {},
  );
  typia.assert(wishlistA);
  // 4) Member B attempts to update Member A's wishlist
  const forbiddenDeletedAt = new Date(Date.now() + 1000 * 60).toISOString();
  await TestValidator.httpError(
    "member B cannot update member A wishlist",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.member.wishlists.updateWishlist(
        memberBConnection,
        {
          wishlistId: wishlistA.id,
          body: {
            deleted_at: forbiddenDeletedAt,
          } satisfies IShoppingMallWishlist.IUpdate,
        },
      );
    },
  );
  // 5) Member A restores wishlist to active state
  const updatedA =
    await api.functional.shoppingMall.member.wishlists.updateWishlist(
      memberAConnection,
      {
        wishlistId: wishlistA.id,
        body: { deleted_at: null } satisfies IShoppingMallWishlist.IUpdate,
      },
    );
  typia.assert(updatedA);
  TestValidator.equals("deletedAt restored to null", updatedA.deletedAt, null);
}
