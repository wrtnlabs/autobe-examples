import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

export async function test_api_customer_wishlist_creation_without_authentication(
  connection: api.IConnection,
) {
  // 1. Attempt to create a wishlist without authentication headers or tokens
  const body = {
    name: RandomGenerator.name(),
  } satisfies IShoppingMallWishlist.ICreate;

  await TestValidator.error(
    "cannot create wishlist without authentication",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.create(connection, {
        body: body,
      });
    },
  );
}
