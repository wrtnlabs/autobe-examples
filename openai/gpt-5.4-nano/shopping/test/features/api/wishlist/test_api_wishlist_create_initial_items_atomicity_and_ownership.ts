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

export async function test_api_wishlist_create_initial_items_atomicity_and_ownership(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member registration (authenticated member context)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember: IShoppingMallMember.IAuthorized =
    await api.functional.shoppingMall.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallMember.IJoin,
    });
  typia.assert(authorizedMember);
  // actor-specific connection for wishlist operations
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: authorizedMember.token.access };
  // 2) Create wishlist with initial wished products (>=2 items)
  // NOTE: We don't have an API here to discover eligible product ids; thus
  // this test validates ownership and that the wishlist container is created
  // successfully when the provided payload is accepted.
  const productId1 = typia.random<string & tags.Format<"uuid">>();
  const productId2 = typia.random<string & tags.Format<"uuid">>();
  const createPayload: IShoppingMallWishlist.ICreate = {
    items: [
      { shopping_mall_product_id: productId1 },
      { shopping_mall_product_id: productId2 },
    ],
  } satisfies IShoppingMallWishlist.ICreate;
  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.member.wishlists.create(userConnection, {
      body: createPayload,
    });
  typia.assert(createdWishlist);
  TestValidator.equals(
    "wishlist ownership matches authenticated member",
    createdWishlist.shoppingMallMemberId,
    authorizedMember.id,
  );
  // 3) Failure consistency (limited to API-level assertion): creation should
  // fail and must not allow a duplicate successful container for the same
  // retry payload.
  const invalidProductId = typia.random<string & tags.Format<"uuid">>();
  const failingPayload: IShoppingMallWishlist.ICreate = {
    items: [{ shopping_mall_product_id: invalidProductId }],
  } satisfies IShoppingMallWishlist.ICreate;
  await TestValidator.error(
    "wishlist creation should fail during initialization",
    async () => {
      await api.functional.shoppingMall.member.wishlists.create(
        userConnection,
        { body: failingPayload },
      );
    },
  );
  // 4) Retry with the previously accepted valid payload should succeed.
  const retryWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.member.wishlists.create(userConnection, {
      body: createPayload,
    });
  typia.assert(retryWishlist);
  TestValidator.equals(
    "retry wishlist ownership matches authenticated member",
    retryWishlist.shoppingMallMemberId,
    authorizedMember.id,
  );
  TestValidator.notEquals(
    "retry should create a separate wishlist id",
    createdWishlist.id,
    retryWishlist.id,
  );
}
