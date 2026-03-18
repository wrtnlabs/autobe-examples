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
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { generate_random_shopping_mall_member_wishlists_create } from "../../../generate/generate_random_shopping_mall_member_wishlists_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

export async function test_api_wishlist_items_idempotent_add_returns_active_state(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };

  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallMember.IJoin;

  const authorized = await authorize_member_join(memberConnection, {
    body: credentials,
  });
  typia.assert(authorized);

  const productInput = prepare_random_shopping_mall_product();
  const product = await generate_random_shopping_mall_member_products_create_product(
    memberConnection,
    typia.assert<
      Parameters<typeof generate_random_shopping_mall_member_products_create_product>[1]
    >(productInput as unknown as Parameters<typeof generate_random_shopping_mall_member_products_create_product>[1]),
  );
  typia.assert(product);

  const wishlistInput = prepare_random_shopping_mall_wishlist();
  const wishlist = await generate_random_shopping_mall_member_wishlists_create(
    memberConnection,
    typia.assert<
      Parameters<typeof generate_random_shopping_mall_member_wishlists_create>[1]
    >(wishlistInput as unknown as Parameters<typeof generate_random_shopping_mall_member_wishlists_create>[1]),
  );
  typia.assert(wishlist);

  const requestItem: IShoppingMallWishlistItem.IRequestItem = typia.assert(
    prepare_random_shopping_mall_wishlist_item() as unknown as IShoppingMallWishlistItem.IRequestItem,
  );

  const body = {
    items: [requestItem],
    page: 1,
    limit: 100,
  } satisfies IShoppingMallWishlistItem.IRequest;

  const first = await api.functional.shoppingMall.member.wishlists.items.patch(
    memberConnection,
    {
      wishlistId: wishlist.id,
      body,
    },
  );
  typia.assert(first);

  TestValidator.equals(
    "wishlist item product id matches",
    first.shoppingMallProductId,
    product.id,
  );
  TestValidator.equals(
    "wishlist item should be active (deletedAt is null)",
    first.deletedAt,
    null,
  );

  const second = await api.functional.shoppingMall.member.wishlists.items.patch(
    memberConnection,
    {
      wishlistId: wishlist.id,
      body,
    },
  );
  typia.assert(second);

  TestValidator.equals(
    "wishlist item product id still matches",
    second.shoppingMallProductId,
    product.id,
  );
  TestValidator.equals(
    "wishlist item should remain active after idempotent call",
    second.deletedAt,
    null,
  );
  TestValidator.equals(
    "wishlist item id should be stable across idempotent calls",
    second.id,
    first.id,
  );
}
