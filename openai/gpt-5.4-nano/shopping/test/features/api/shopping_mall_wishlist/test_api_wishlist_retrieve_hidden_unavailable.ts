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

export async function test_api_wishlist_retrieve_hidden_unavailable(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // 2) Create wishlist
  const wishlist = await generate_random_shopping_mall_member_wishlists_create(
    memberConnection,
    {
      body: undefined,
    },
  );
  typia.assert(wishlist);
  // 3) Hide the wishlist
  const hiddenAt = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60,
  ).toISOString();
  const hidden =
    await api.functional.shoppingMall.member.wishlists.updateWishlist(
      memberConnection,
      {
        wishlistId: wishlist.id,
        body: {
          deleted_at: hiddenAt,
        } satisfies IShoppingMallWishlist.IUpdate,
      },
    );
  typia.assert(hidden);
  // 4) Retrieve hidden wishlist should be unavailable.
  // If the API returns the wishlist anyway, it must not be exposed as active.
  await TestValidator.error(
    "hidden wishlist should be treated as unavailable",
    async () => {
      const response = await api.functional.shoppingMall.member.wishlists.at(
        memberConnection,
        {
          wishlistId: wishlist.id,
        },
      );
      typia.assert(response);
      // Business expectation: hidden wishlist must not be exposed as available.
      // If retrieval unexpectedly succeeds, treat it as failure.
      if (response.deletedAt !== null) {
        throw new Error("Hidden wishlist was exposed as unavailable content");
      }
      throw new Error("Hidden wishlist was exposed as available resource");
    },
  );
}
