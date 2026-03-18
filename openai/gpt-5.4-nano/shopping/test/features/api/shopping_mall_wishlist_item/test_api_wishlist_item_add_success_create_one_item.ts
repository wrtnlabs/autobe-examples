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

export async function test_api_wishlist_item_add_success_create_one_item(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member actor setup via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallMember.IJoin,
    },
  );
  typia.assert(member);
  // 2) Create an owned wishlist container
  const wishlist: IShoppingMallWishlist =
    await generate_random_shopping_mall_member_wishlists_create(
      memberConnection,
      {
        body: {} satisfies IShoppingMallWishlist.ICreate,
      },
    );
  typia.assert(wishlist);
  // 3) Add one wishlist item using generator that prepares an eligible product
  const created: IShoppingMallWishlistItem =
    await generate_random_shopping_mall_member_wishlists_items_create_wishlist_item(
      memberConnection,
      {
        params: { wishlistId: wishlist.id },
        body: undefined,
      },
    );
  typia.assert(created);
  // 4) Validate response consistency
  TestValidator.equals(
    "wishlist id matches",
    created.shoppingMallWishlistId,
    wishlist.id,
  );
  TestValidator.equals("deletedAt is null", created.deletedAt, null);
  TestValidator.predicate("createdAt is present", created.createdAt.length > 0);
  TestValidator.predicate("updatedAt is present", created.updatedAt.length > 0);
}
