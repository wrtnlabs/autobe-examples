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

export async function test_api_wishlist_items_product_deletion_auto_removal_prevents_readd(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16) satisfies string &
    tags.Format<"password">;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  const actorConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(actorConnection, {
    body: {
      email: memberAuth.email,
      password,
    } satisfies IShoppingMallMember.ILogin,
  });
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      actorConnection,
      {
        body: {
          shopping_mall_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          code: RandomGenerator.alphaNumeric(12),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_featured: false,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const wishlist = await generate_random_shopping_mall_member_wishlists_create(
    actorConnection,
    {
      body: {},
    },
  );
  typia.assert(wishlist);
  // NOTE: IRequestItem is an empty object type in the provided DTO definitions.
  // So the request can only express the target products via server-side inference
  // from the parent request, which is not represented in DTO. We can still test
  // idempotency by repeating the same PATCH call.
  const requestBody: IShoppingMallWishlistItem.IRequest = {
    items: [{} satisfies IShoppingMallWishlistItem.IRequestItem],
  };
  const first = await api.functional.shoppingMall.member.wishlists.items.patch(
    actorConnection,
    {
      wishlistId: wishlist.id,
      body: requestBody,
    },
  );
  typia.assert(first);
  TestValidator.equals(
    "wishlist item refers to created product",
    first.shoppingMallProductId,
    product.id,
  );
  TestValidator.equals("wishlist item is active", first.deletedAt, null);
  const second = await api.functional.shoppingMall.member.wishlists.items.patch(
    actorConnection,
    {
      wishlistId: wishlist.id,
      body: requestBody,
    },
  );
  typia.assert(second);
  TestValidator.equals(
    "repeated patch keeps same product",
    second.shoppingMallProductId,
    product.id,
  );
  TestValidator.equals(
    "repeated patch does not create removed state",
    second.deletedAt,
    null,
  );
}
