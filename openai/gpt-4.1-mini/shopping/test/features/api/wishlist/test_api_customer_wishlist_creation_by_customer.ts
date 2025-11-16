import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

export async function test_api_customer_wishlist_creation_by_customer(
  connection: api.IConnection,
) {
  // Register new customer user
  const customerBody = {
    email: `user${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "strongpassword123",
    full_name: RandomGenerator.name(),
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBody,
    });
  typia.assert(customer);

  // Create a wishlist using authenticated customer context
  const wishlistBody = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert(wishlist);

  // Validate that the created wishlist's customer_id matches the authenticated customer's id
  TestValidator.equals(
    "wishlist customer_id matches authenticated user",
    wishlist.customer_id,
    customer.id,
  );
  TestValidator.predicate(
    "wishlist status is active",
    wishlist.status === "active",
  );
}
