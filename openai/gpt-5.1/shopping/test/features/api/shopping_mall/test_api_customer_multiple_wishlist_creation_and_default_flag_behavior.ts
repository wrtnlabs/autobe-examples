import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate multiple wishlist creation and default-flag behavior for a customer.
 *
 * Business context:
 *
 * - A customer joins the shopping mall platform and is immediately authenticated.
 * - The customer can create named wishlists that belong to them, each with status
 *   and an optional is_default flag.
 * - Business rules typically expect only one default wishlist per customer, but
 *   with only the create endpoint available we can at least verify that
 *   creating multiple wishlists with is_default=true:
 *
 *   - Is accepted by the API, and
 *   - Returns responses that are internally consistent with the authenticated
 *       customer and the requested fields.
 *
 * Test steps:
 *
 * 1. Register a new customer using POST /auth/customer/join.
 *
 *    - Generate a valid email, password, href, and referrer using typia.random.
 *    - Optionally set ip to null to exercise its optionality.
 *    - Assert the authorized customer payload.
 * 2. Create the first wishlist as default via POST
 *    /shoppingMall/customer/wishlists.
 *
 *    - Use IShoppingMallWishlist.ICreate with:
 *
 *         - Name: random human-readable label.
 *         - Description: random paragraph text.
 *         - Is_default: true.
 *         - Status: "active".
 *    - Assert the response type and verify:
 *
 *         - Name and status echo the request.
 *         - Is_default is true.
 *         - Customer summary id/email match the authorized customer.
 * 3. Create a second wishlist also requesting default.
 *
 *    - Use a distinct name/description, is_default: true, status: "active".
 *    - Assert the response and validate field echoes and ownership as above.
 *    - Confirm the second wishlist is_default flag is true, demonstrating that the
 *         service honors the default request at creation time.
 * 4. Perform consistency checks around default flags.
 *
 *    - Validate that at least one wishlist is default (both are expected true here).
 *    - Note in comments that we cannot fully assert single-default enforcement
 *         across all wishlists because only the create endpoint is available;
 *         we focus on response consistency instead.
 */
export async function test_api_customer_multiple_wishlist_creation_and_default_flag_behavior(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create the first wishlist as default
  const firstWishlistBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const firstWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: firstWishlistBody,
    });
  typia.assert(firstWishlist);

  // Ownership and field echo checks for first wishlist
  TestValidator.equals(
    "first wishlist customer id matches authorized customer",
    firstWishlist.customer.id,
    authorizedCustomer.id,
  );
  TestValidator.equals(
    "first wishlist customer email matches authorized customer",
    firstWishlist.customer.email,
    authorizedCustomer.email,
  );
  TestValidator.equals(
    "first wishlist name echoes request",
    firstWishlist.name,
    firstWishlistBody.name,
  );
  TestValidator.equals(
    "first wishlist status echoes request",
    firstWishlist.status,
    firstWishlistBody.status,
  );
  TestValidator.predicate(
    "first wishlist is marked as default",
    firstWishlist.is_default === true,
  );

  // 3. Create a second wishlist also requesting default
  const secondWishlistBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const secondWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: secondWishlistBody,
    });
  typia.assert(secondWishlist);

  // Ownership and field echo checks for second wishlist
  TestValidator.equals(
    "second wishlist customer id matches authorized customer",
    secondWishlist.customer.id,
    authorizedCustomer.id,
  );
  TestValidator.equals(
    "second wishlist customer email matches authorized customer",
    secondWishlist.customer.email,
    authorizedCustomer.email,
  );
  TestValidator.equals(
    "second wishlist name echoes request",
    secondWishlist.name,
    secondWishlistBody.name,
  );
  TestValidator.equals(
    "second wishlist status echoes request",
    secondWishlist.status,
    secondWishlistBody.status,
  );
  TestValidator.predicate(
    "second wishlist is marked as default",
    secondWishlist.is_default === true,
  );

  // 4. Consistency check: at least one wishlist is default (both are expected)
  TestValidator.predicate(
    "at least one wishlist is default among created wishlists",
    firstWishlist.is_default === true || secondWishlist.is_default === true,
  );
}
