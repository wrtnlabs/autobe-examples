import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

export async function test_api_wishlist_creation_non_default_with_description(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer so that subsequent wishlist
  //    operations run under a valid customer context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 2. Create a non-default, active wishlist with a detailed description.
  const wishlistName = "Gifts for Family";
  const wishlistDescription = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 10,
  });

  const createWishlistBody = {
    name: wishlistName,
    description: wishlistDescription,
    status: "active",
    is_default: false,
  } satisfies IShoppingMallWishlist.ICreate;

  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createWishlistBody,
    });
  typia.assert<IShoppingMallWishlist>(createdWishlist);

  // 3. Assert that core fields reflect the request payload semantics.

  // 3-1. Name is preserved.
  TestValidator.equals(
    "wishlist name should match requested name",
    createdWishlist.name,
    wishlistName,
  );

  // 3-2. Description is non-null/non-undefined and preserved.
  await TestValidator.predicate(
    "wishlist description should be set",
    async () => {
      return (
        createdWishlist.description !== null &&
        createdWishlist.description !== undefined &&
        createdWishlist.description.length > 0
      );
    },
  );

  if (
    createdWishlist.description !== null &&
    createdWishlist.description !== undefined
  ) {
    TestValidator.equals(
      "wishlist description should match requested description",
      createdWishlist.description,
      wishlistDescription,
    );
  }

  // 3-3. is_default must be false for this scenario.
  TestValidator.predicate(
    "wishlist should be explicitly non-default",
    createdWishlist.is_default === false,
  );

  // 3-4. status should be active.
  TestValidator.equals(
    "wishlist status should be 'active'",
    createdWishlist.status,
    "active",
  );

  // 4. Timestamps and deletion semantics.
  // (We do not re-validate date-time formats; typia.assert already did.)

  TestValidator.predicate(
    "wishlist created_at should be a non-empty string",
    createdWishlist.created_at.length > 0,
  );

  TestValidator.predicate(
    "wishlist updated_at should be a non-empty string",
    createdWishlist.updated_at.length > 0,
  );

  TestValidator.predicate(
    "wishlist deleted_at should be null or undefined for a newly created wishlist",
    createdWishlist.deleted_at === null ||
      createdWishlist.deleted_at === undefined,
  );

  // 5. Ownership sanity check: the wishlist's customer should match the
  //    authenticated customer identity.
  TestValidator.equals(
    "wishlist customer id should match authenticated customer id",
    createdWishlist.customer.id,
    customerAuthorized.id,
  );
  TestValidator.equals(
    "wishlist customer email should match authenticated customer email",
    createdWishlist.customer.email,
    customerAuthorized.email,
  );
}
