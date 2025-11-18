import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Verify that updating a wishlist can rename it and set a description while
 * preserving all other attributes and ownership.
 *
 * Business goal
 *
 * - Ensure PUT /shoppingMall/customer/wishlists/{wishlistId} performs a partial
 *   update based on IShoppingMallWishlist.IUpdate: only provided fields (name,
 *   description) are changed and omitted fields (is_default, status) remain as
 *   they were.
 * - Confirm that the wishlist stays bound to the same customer and that audit
 *   timestamps behave correctly (created_at stable, updated_at refreshed,
 *   deleted_at null).
 *
 * Scenario steps
 *
 * 1. Join a new customer using /auth/customer/join to obtain an authenticated
 *    customer context on the shared connection.
 * 2. Create a wishlist using /shoppingMall/customer/wishlists with a simple
 *    IShoppingMallWishlist.ICreate payload having name = "Default", description
 *    = null, status = "active", is_default = true.
 * 3. Update the wishlist via /shoppingMall/customer/wishlists/{wishlistId} with an
 *    IShoppingMallWishlist.IUpdate payload that sets
 *
 *    - Name = "Holiday Deals"
 *    - Description = a non-null string
 *    - Omits is_default and status entirely.
 * 4. Validate that the response wishlist reflects the new name and description
 *    only, preserving id, ownership, status, is_default, created_at, and
 *    deleted_at, and that updated_at has advanced.
 */
export async function test_api_wishlist_update_rename_and_description(
  connection: api.IConnection,
) {
  // 1. Authenticate a new customer via join, which also sets Authorization header
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Create an initial wishlist for this customer
  const createBody = {
    name: "Default",
    description: null,
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const original: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallWishlist>(original);

  // Basic sanity on original wishlist
  TestValidator.equals(
    "original wishlist belongs to joined customer",
    original.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "original wishlist name should match create body",
    original.name,
    createBody.name,
  );
  TestValidator.equals(
    "original wishlist description should be null",
    original.description ?? null,
    createBody.description,
  );
  TestValidator.equals(
    "original wishlist status should match create body",
    original.status,
    createBody.status,
  );
  TestValidator.equals(
    "original wishlist is_default should match create body",
    original.is_default,
    createBody.is_default ?? false,
  );

  // 3. Update wishlist: rename and set description only
  const updatedName = "Holiday Deals";
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });

  const updateBody = {
    name: updatedName,
    description: updatedDescription,
  } satisfies IShoppingMallWishlist.IUpdate;

  const updated: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: original.id,
      body: updateBody,
    });
  typia.assert<IShoppingMallWishlist>(updated);

  // 4. Validate business rules and partial update behavior

  // 4-1. Same identity and ownership
  TestValidator.equals(
    "wishlist id remains unchanged after update",
    updated.id,
    original.id,
  );
  TestValidator.equals(
    "wishlist customer summary remains identical",
    updated.customer,
    original.customer,
  );

  // 4-2. Name and description updated as requested
  TestValidator.equals(
    "wishlist name has been updated to new value",
    updated.name,
    updatedName,
  );
  TestValidator.notEquals(
    "wishlist name changed from original",
    updated.name,
    original.name,
  );
  TestValidator.equals(
    "wishlist description updated to non-null value",
    updated.description ?? null,
    updatedDescription,
  );

  // 4-3. is_default and status preserved (not changed by partial update)
  TestValidator.equals(
    "wishlist is_default flag preserved across update",
    updated.is_default,
    original.is_default,
  );
  TestValidator.equals(
    "wishlist status preserved across update",
    updated.status,
    original.status,
  );

  // 4-4. Audit timestamps
  TestValidator.equals(
    "created_at remains unchanged after wishlist update",
    updated.created_at,
    original.created_at,
  );

  // Ensure updated_at is not older than original.updated_at
  TestValidator.predicate(
    "updated_at is greater than or equal to original.updated_at",
    () => updated.updated_at >= original.updated_at,
  );

  // deleted_at should remain null/undefined
  TestValidator.equals(
    "deleted_at remains null after update",
    updated.deleted_at ?? null,
    original.deleted_at ?? null,
  );
}
