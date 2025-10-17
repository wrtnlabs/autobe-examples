import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * This test function verifies the update operation on a customer's wishlist
 * identified by its unique wishlist ID in the shopping mall platform. The test
 * ensures business logic adherence and validation of authorization
 * constraints.
 *
 * It performs the following steps:
 *
 * 1. Registers and authenticates a customer using the join API to provide valid
 *    authorization.
 * 2. Creates a customer entity, representing a shopping mall customer.
 * 3. Creates a wishlist associated with the authenticated (owner) customer.
 * 4. Updates the wishlist by setting the associated customer ID and updated_at
 *    timestamp.
 * 5. Validates that the update response reflects correct data and timestamps,
 *    maintaining immutable created_at and nullable deleted_at.
 *
 * All data conforms strictly to DTO schemas, UUID, and ISO8601 formats.
 */
export async function test_api_customer_wishlist_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Customer registration and login
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
  } satisfies IShoppingMallCustomer.IJoin;
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // Step 2: Use authenticated customer's ID as the single customer
  //    since authorizer must own the wishlist
  const customerId = authorizedCustomer.id;

  // Step 3: Create wishlist before update with authenticated customer ID
  const createWishlistBody = {
    shopping_mall_customer_id: customerId,
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createWishlistBody,
    });
  typia.assert(wishlist);

  // Step 4: Update wishlist's associated customer ID and updated_at timestamp
  const newUpdatedAt = new Date().toISOString();
  const updateWishlistBody = {
    shopping_mall_customer_id: customerId,
    updated_at: newUpdatedAt,
  } satisfies IShoppingMallWishlist.IUpdate;
  const updatedWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: wishlist.id,
      body: updateWishlistBody,
    });
  typia.assert(updatedWishlist);

  // Step 5: Validations
  TestValidator.equals(
    "wishlist id should be unchanged",
    updatedWishlist.id,
    wishlist.id,
  );
  TestValidator.equals(
    "wishlist customer id should be updated",
    updatedWishlist.shopping_mall_customer_id,
    updateWishlistBody.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "wishlist created_at should be unchanged",
    updatedWishlist.created_at,
    wishlist.created_at,
  );
  TestValidator.equals(
    "wishlist updated_at should be updated",
    updatedWishlist.updated_at,
    updateWishlistBody.updated_at,
  );
  TestValidator.equals(
    "wishlist deleted_at should remain null or undefined",
    updatedWishlist.deleted_at ?? null,
    null,
  );
}
