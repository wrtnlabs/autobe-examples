import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Test creating a new shopping wishlist for an authenticated customer.
 *
 * This test performs the full flow:
 *
 * 1. Create a new customer with valid email, password hash, optional nickname,
 *    phone number, and status.
 * 2. Authenticate the customer using the join endpoint to get the authorized
 *    customer info and token.
 * 3. Create a new wishlist linked to the authenticated customer's ID.
 * 4. Validate the newly created wishlist's properties.
 *
 * All API calls use correct DTO types with proper `satisfies` usage. Response
 * data is validated using `typia.assert` for full type assurance. Test
 * assertions verify linkage via customer ID and ensure ID and timestamps format
 * validity.
 */
export async function test_api_create_wishlist_by_customer(
  connection: api.IConnection,
) {
  // 1. Create a new customer account with valid data
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    nickname: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 2. Authenticate the created customer with join endpoint
  const customerJoinBody = {
    email: customer.email,
    password: customerCreateBody.password_hash,
  } satisfies IShoppingMallCustomer.IJoin;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(authorizedCustomer);

  // 3. Create a new wishlist linked to the authorized customer
  const wishlistCreateBody = {
    shopping_mall_customer_id: authorizedCustomer.id,
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert(wishlist);

  // 4. Assertions to validate correctness
  TestValidator.equals(
    "wishlist's linked customer id",
    wishlist.shopping_mall_customer_id,
    authorizedCustomer.id,
  );

  TestValidator.predicate(
    "wishlist id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      wishlist.id,
    ),
  );

  TestValidator.predicate(
    "wishlist created_at is ISO datetime string",
    typeof wishlist.created_at === "string" && wishlist.created_at.length > 0,
  );
  TestValidator.predicate(
    "wishlist updated_at is ISO datetime string",
    typeof wishlist.updated_at === "string" && wishlist.updated_at.length > 0,
  );

  TestValidator.predicate(
    "wishlist deleted_at is null or undefined",
    wishlist.deleted_at === null || wishlist.deleted_at === undefined,
  );
}
