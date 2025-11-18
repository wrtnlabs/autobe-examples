import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

export async function test_api_wishlist_creation_multiple_lists_default_switching(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional, let backend derive it
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(customer);

  // 2. Create the first wishlist as default
  const firstCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const firstWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: firstCreateBody,
    });
  typia.assert(firstWishlist);

  // Basic invariants for first wishlist
  TestValidator.equals(
    "first wishlist belongs to joined customer",
    firstWishlist.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "first wishlist status matches requested status",
    firstWishlist.status,
    firstCreateBody.status,
  );
  TestValidator.equals(
    "first wishlist is_default reflects request",
    firstWishlist.is_default,
    firstCreateBody.is_default ?? false,
  );

  // 3. Create the second wishlist also requesting it as default
  const secondCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const secondWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: secondCreateBody,
    });
  typia.assert(secondWishlist);

  // 4. Validate relationships and uniqueness between the two wishlists
  TestValidator.notEquals(
    "wishlist IDs must be different for separate creations",
    firstWishlist.id,
    secondWishlist.id,
  );

  TestValidator.equals(
    "second wishlist belongs to same customer",
    secondWishlist.customer.id,
    customer.id,
  );

  TestValidator.equals(
    "second wishlist is created as default",
    secondWishlist.is_default,
    true,
  );

  // 5. Partial invariant: the latest created wishlist is default for the customer.
  // With only POST endpoints available, we can't re-fetch the first wishlist to
  // inspect its updated is_default flag, nor can we list all wishlists.
  // Therefore, we assert only what can be observed from the outputs we do have.
  TestValidator.equals(
    "latest created wishlist has default flag true",
    secondWishlist.is_default,
    true,
  );
}
