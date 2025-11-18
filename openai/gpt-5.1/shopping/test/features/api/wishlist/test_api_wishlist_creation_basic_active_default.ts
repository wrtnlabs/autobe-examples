import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate creation of a basic active default wishlist for a freshly joined
 * customer.
 *
 * Business intent:
 *
 * - A newly registered customer should be able to create a wishlist that is
 *   active, marked as default, and owned by the authenticated customer
 *   context.
 * - Ownership must come exclusively from the current authentication context; no
 *   customer id is ever supplied in the wishlist creation body.
 * - The response must embed a valid customer summary and reflect the requested
 *   business fields (name, status, is_default, description) together with
 *   correct lifecycle timestamps and soft-deletion semantics.
 *
 * Scenario steps:
 *
 * 1. Join as a new customer using /auth/customer/join and obtain the
 *    IShoppingMallCustomer.IAuthorized payload. The SDK will set the
 *    Authorization header on the connection automatically using the token.
 * 2. Call /shoppingMall/customer/wishlists via
 *    api.functional.shoppingMall.customer.wishlists.create with an
 *    IShoppingMallWishlist.ICreate body specifying:
 *
 *    - Name: "Default" (or equivalent short label)
 *    - Description: null (explicitly exercising nullable description field)
 *    - Is_default: true
 *    - Status: "active"
 * 3. Assert that the response:
 *
 *    - Conforms to IShoppingMallWishlist (typia.assert).
 *    - Has a non-empty UUID id.
 *    - Embeds a customer summary whose id and email mirror the authenticated
 *         customer from step 1, with consistent status/email_verified fields.
 *    - Preserves the requested name, is_default flag, status, and null description.
 *    - Has non-null created_at and updated_at timestamps in date-time format, and
 *         deleted_at is null to indicate logical activity.
 * 4. Optionally, perform light sanity checks on timestamp ordering (e.g.
 *    updated_at is not earlier than created_at) without depending on exact
 *    equality semantics.
 */
export async function test_api_wishlist_creation_basic_active_default(
  connection: api.IConnection,
) {
  // 1. Register a new customer and obtain an authorized context.
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
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorizedCustomer);

  // 2. Create an active default wishlist for the authenticated customer.
  const wishlistCreateBody = {
    name: "Default",
    description: null,
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert<IShoppingMallWishlist>(wishlist);

  // 3. Business-level validations on the created wishlist.

  // 3-1. Ownership: wishlist.customer must match the authenticated customer.
  TestValidator.equals(
    "wishlist customer id matches authorized customer id",
    wishlist.customer.id,
    authorizedCustomer.id,
  );
  TestValidator.equals(
    "wishlist customer email matches authorized customer email",
    wishlist.customer.email,
    authorizedCustomer.email,
  );

  // 3-2. Requested fields are preserved.
  TestValidator.equals(
    "wishlist name matches requested literal name",
    wishlist.name,
    "Default",
  );
  TestValidator.equals(
    "wishlist description remains null as requested",
    wishlist.description ?? null,
    null,
  );
  TestValidator.equals(
    "wishlist is_default flag is true as requested",
    wishlist.is_default,
    true,
  );
  TestValidator.equals(
    "wishlist status is 'active' as requested",
    wishlist.status,
    "active",
  );

  // 3-3. Lifecycle timestamps and soft-deletion semantics.
  TestValidator.predicate(
    "wishlist created_at is a non-empty string",
    wishlist.created_at.length > 0,
  );
  TestValidator.predicate(
    "wishlist updated_at is a non-empty string",
    wishlist.updated_at.length > 0,
  );
  TestValidator.equals(
    "wishlist deleted_at is null indicating logical activity",
    wishlist.deleted_at ?? null,
    null,
  );

  // 3-4. Optional sanity check: updated_at is not earlier than created_at.
  const createdAt = new Date(wishlist.created_at).getTime();
  const updatedAt = new Date(wishlist.updated_at).getTime();
  TestValidator.predicate(
    "wishlist updated_at is not earlier than created_at",
    () => updatedAt >= createdAt,
  );
}
