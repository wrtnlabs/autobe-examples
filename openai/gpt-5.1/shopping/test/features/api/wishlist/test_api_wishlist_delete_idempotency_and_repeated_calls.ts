import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate idempotent-like behavior of deleting a customer wishlist.
 *
 * Business context
 *
 * - Customers can register (join) and immediately start managing wishlists.
 * - A wishlist is a customer-owned resource identified by a server-generated
 *   UUID.
 * - DELETE on a wishlist should be safe to call from the client even if the
 *   wishlist has already been removed, i.e., repeated delete attempts should
 *   not lead to inconsistent client state or unexpected SDK failures.
 *
 * Test steps
 *
 * 1. Register a new customer via POST /auth/customer/join and rely on the SDK to
 *    install the returned access token into connection.headers.
 * 2. Create a wishlist for that authenticated customer using POST
 *    /shoppingMall/customer/wishlists and capture the returned
 *    IShoppingMallWishlist, especially its id and customer.id.
 * 3. Perform sanity checks on the created wishlist: typia.assert on the DTO and
 *    ensure that the customer summary id matches the authenticated customer id,
 *    and that basic fields such as name and status round-trip as expected.
 * 4. Call DELETE /shoppingMall/customer/wishlists/{wishlistId} once with the
 *    wishlist.id as path parameter. This should succeed for an existing
 *    wishlist; any thrown error will naturally fail the test.
 * 5. Immediately call the same DELETE again with the same wishlistId and same
 *    authenticated connection, asserting that no client-side exception is
 *    thrown (idempotent from the SDK consumer perspective), regardless of the
 *    concrete HTTP status code.
 *
 * Within the provided SDK, we cannot inspect HTTP status codes or re-fetch the
 * wishlist after deletion, nor can we assert on deleted_at directly, so the
 * test focuses on end-to-end behavior and absence of SDK-level failures under
 * repeated deletion.
 */
export async function test_api_wishlist_delete_idempotency_and_repeated_calls(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join) so that subsequent wishlist operations
  // run in an authenticated customer context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // allow server to derive IP if desired
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorizedCustomer = await api.functional.auth.customer.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorizedCustomer);

  // 2. Create a wishlist for the authenticated customer.
  const createWishlistBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: createWishlistBody,
    },
  );
  typia.assert<IShoppingMallWishlist>(wishlist);

  // 3. Sanity checks on ownership and basic round-trip fields.
  TestValidator.equals(
    "wishlist owner id should match authorized customer id",
    wishlist.customer.id,
    authorizedCustomer.id,
  );

  TestValidator.equals(
    "wishlist name should match creation input",
    wishlist.name,
    createWishlistBody.name,
  );

  TestValidator.equals(
    "wishlist status should match creation input",
    wishlist.status,
    createWishlistBody.status,
  );

  // 4. First delete call should succeed for an existing wishlist.
  await api.functional.shoppingMall.customer.wishlists.erase(connection, {
    wishlistId: wishlist.id,
  });

  // 5. Second delete call with the same wishlistId should not cause
  // client-side/SDK failures even if the underlying resource is already gone.
  await api.functional.shoppingMall.customer.wishlists.erase(connection, {
    wishlistId: wishlist.id,
  });
}
