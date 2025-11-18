import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate updating a customer wishlist status from active to archived.
 *
 * Business goals:
 *
 * - Ensure a newly created wishlist with status "active" and is_default=false can
 *   transition its status to "archived" using the update endpoint.
 * - Confirm that archiving does not soft-delete the wishlist (deleted_at remains
 *   null) and that ownership and non-updated attributes remain intact.
 *
 * Scenario steps:
 *
 * 1. Register (join) a new customer using auth.customer.join to obtain an
 *    authenticated customer context.
 * 2. Create a wishlist for this customer via
 *    shoppingMall.customer.wishlists.create with:
 *
 *    - Status = "active"
 *    - Is_default = false
 * 3. Update the wishlist by calling shoppingMall.customer.wishlists.update with
 *    body.status = "archived" only.
 * 4. Validate the response wishlist:
 *
 *    - Id is unchanged
 *    - Customer.id equals the joined customer id
 *    - Status is now "archived" while the original was "active"
 *    - Name and description remain unchanged
 *    - Is_default remains false
 *    - Deleted_at is null.
 */
export async function test_api_wishlist_update_status_to_archived(
  connection: api.IConnection,
) {
  // 1. Join a new customer to obtain an authenticated context
  const joinRequest = typia.random<IShoppingMallCustomerJoin.IRequest>();
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorizedCustomer);

  // 2. Create an active, non-default wishlist for this customer
  const createBase = typia.random<IShoppingMallWishlist.ICreate>();
  const createBody = {
    ...createBase,
    status: "active",
    is_default: false,
  } satisfies IShoppingMallWishlist.ICreate;

  const created: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Basic sanity checks on creation
  TestValidator.equals(
    "created wishlist status should be active",
    created.status,
    "active",
  );
  TestValidator.equals(
    "created wishlist should be non-default",
    created.is_default,
    false,
  );
  TestValidator.equals(
    "created wishlist customer must match joined customer",
    created.customer.id,
    authorizedCustomer.id,
  );

  const originalName = created.name;
  const originalDescription = created.description ?? null;
  const originalId = created.id;

  // 3. Update wishlist status to archived
  const updated: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: created.id,
      body: {
        status: "archived",
      } satisfies IShoppingMallWishlist.IUpdate,
    });
  typia.assert(updated);

  // 4. Validate the updated wishlist
  TestValidator.equals(
    "wishlist id must remain unchanged after update",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "wishlist owner must remain the same customer",
    updated.customer.id,
    authorizedCustomer.id,
  );

  TestValidator.equals(
    "wishlist name must remain unchanged after status update",
    updated.name,
    originalName,
  );

  TestValidator.equals(
    "wishlist description must remain unchanged after status update",
    updated.description ?? null,
    originalDescription,
  );

  TestValidator.equals(
    "wishlist status should be updated to archived",
    updated.status,
    "archived",
  );
  TestValidator.notEquals(
    "wishlist status should differ from original active value",
    updated.status,
    created.status,
  );

  TestValidator.equals(
    "wishlist is_default flag should remain false after status update",
    updated.is_default,
    false,
  );

  TestValidator.equals(
    "archiving wishlist must not set deleted_at (remains null)",
    updated.deleted_at ?? null,
    null,
  );
}
