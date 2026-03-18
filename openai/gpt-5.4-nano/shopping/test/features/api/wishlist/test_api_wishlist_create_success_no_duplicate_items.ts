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

export async function test_api_wishlist_create_success_no_duplicate_items(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  const wishlistConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(wishlistConnection, {
    body: {
      email: authorized.email,
      password: memberPassword,
    } satisfies IShoppingMallMember.ILogin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const createBody = {
    items: [
      {
        shopping_mall_product_id: productId,
      },
      {
        shopping_mall_product_id: productId,
      },
    ],
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlist = await api.functional.shoppingMall.member.wishlists.create(
    wishlistConnection,
    {
      body: createBody,
    },
  );
  typia.assert(wishlist);
  TestValidator.predicate(
    "wishlist id should be non-empty",
    wishlist.id.length > 0,
  );
  TestValidator.equals(
    "wishlist owned by member",
    wishlist.shoppingMallMemberId,
    authorized.id,
  );
}
