import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate wishlist update behavior for nullable fields and default flag
 * demotion.
 *
 * Business scenario:
 *
 * - A new customer joins and becomes authenticated.
 * - The customer creates a default wishlist with a non-null description and
 *   active status.
 * - The customer updates that wishlist, explicitly clearing the description
 *   (setting it to null) and unsetting it as default (is_default=false), while
 *   omitting name and status.
 * - The test validates that null vs omission is handled correctly and that
 *   is_default is updated.
 */
export async function test_api_wishlist_update_clear_description_and_unset_default(
  connection: api.IConnection,
) {
  // 1. Customer joins and gets authorized
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create an initial default wishlist with non-null description and active status
  const originalName = "Seasonal Picks";
  const originalDescription = "Items to watch during holiday sales";
  const originalStatus = "active";

  const createBody = {
    name: originalName,
    description: originalDescription,
    is_default: true,
    status: originalStatus,
  } satisfies IShoppingMallWishlist.ICreate;

  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createBody,
    });
  typia.assert(createdWishlist);

  // Basic sanity checks on created wishlist
  TestValidator.equals(
    "created wishlist name should match input",
    createdWishlist.name,
    originalName,
  );
  TestValidator.equals(
    "created wishlist description should match input",
    createdWishlist.description,
    originalDescription,
  );
  TestValidator.equals(
    "created wishlist status should match input",
    createdWishlist.status,
    originalStatus,
  );
  TestValidator.equals(
    "created wishlist should be default",
    createdWishlist.is_default,
    true,
  );

  // 3. Update the wishlist: clear description and unset default, omit name/status
  const updateBody = {
    description: null,
    is_default: false,
  } satisfies IShoppingMallWishlist.IUpdate;

  const updatedWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: createdWishlist.id,
      body: updateBody,
    });
  typia.assert(updatedWishlist);

  // 4. Validate updated wishlist field semantics
  TestValidator.equals(
    "wishlist id should remain unchanged after update",
    updatedWishlist.id,
    createdWishlist.id,
  );
  TestValidator.equals(
    "wishlist owner should remain the same",
    updatedWishlist.customer.id,
    createdWishlist.customer.id,
  );

  // description: explicitly cleared to null
  TestValidator.equals(
    "wishlist description should be cleared to null by update",
    updatedWishlist.description,
    null,
  );

  // is_default: explicitly set to false
  TestValidator.equals(
    "wishlist default flag should be unset (false)",
    updatedWishlist.is_default,
    false,
  );

  // name should remain unchanged because it was omitted from update
  TestValidator.equals(
    "wishlist name should remain unchanged when omitted in update",
    updatedWishlist.name,
    createdWishlist.name,
  );

  // status should remain unchanged because it was omitted from update
  TestValidator.equals(
    "wishlist status should remain unchanged when omitted in update",
    updatedWishlist.status,
    createdWishlist.status,
  );

  // Timestamps: created_at should remain, updated_at should be a valid date-time
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedWishlist.created_at,
    createdWishlist.created_at,
  );

  // We do not assert ordering between created_at and updated_at, but ensure it's a string
  // and typia.assert has already validated the date-time format.
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    typeof updatedWishlist.updated_at === "string" &&
      updatedWishlist.updated_at.length > 0,
  );
}
