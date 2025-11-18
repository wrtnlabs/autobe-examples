import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Enforce ownership when retrieving wishlist details.
 *
 * This E2E test ensures that the wishlist detail endpoint `GET
 * /shoppingMall/customer/wishlists/{wishlistId}` does not allow one
 * authenticated customer to read another customer’s wishlist, even if the
 * wishlist UUID is known or guessed.
 *
 * Business flow:
 *
 * 1. Customer A joins the platform and becomes authenticated.
 * 2. Customer A creates a new wishlist; we record its id.
 * 3. Customer B joins the platform and becomes the current authenticated actor on
 *    the same connection.
 * 4. While authenticated as customer B, attempt to fetch customer A’s wishlist
 *    detail using the previously recorded id.
 * 5. Validate that this cross-account access is rejected with an error and no
 *    wishlist details are returned.
 *
 * Ownership rule under test:
 *
 * - Only the owning customer may retrieve a wishlist’s details. Any other
 *   customer must receive an error response and must not see the wishlist.
 */
export async function test_api_customer_wishlist_detail_ownership_enforcement(
  connection: api.IConnection,
) {
  // 1. Customer A joins and becomes authenticated on the connection.
  const joinRequestA = typia.random<IShoppingMallCustomerJoin.IRequest>();
  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinRequestA,
    });
  typia.assert(customerA);

  // 2. Customer A creates a wishlist and we record its id.
  const wishlistCreateBodyA = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    // Explicitly set is_default to true to mark it as main list
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlistA: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBodyA,
    });
  typia.assert(wishlistA);

  // Sanity check: wishlist belongs to customer A
  TestValidator.equals(
    "wishlist owner must be customer A",
    wishlistA.customer.id,
    customerA.id,
  );

  // Capture A's wishlist id for later unauthorized access attempt.
  const wishlistIdOfA: string & tags.Format<"uuid"> = wishlistA.id;

  // 3. Customer B joins and becomes the current authenticated actor.
  const joinRequestB = typia.random<IShoppingMallCustomerJoin.IRequest>();
  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinRequestB,
    });
  typia.assert(customerB);

  // Ensure B is distinct from A by id (logical sanity check, not a hard
  // requirement but protects the scenario).
  TestValidator.notEquals(
    "customer B id must differ from customer A id",
    customerB.id,
    customerA.id,
  );

  // 4. While authenticated as customer B, attempt to read customer A's wishlist.
  await TestValidator.error(
    "customer B must not be able to access customer A's wishlist detail",
    async () => {
      // This call is expected to fail with an HttpError due to ownership
      // enforcement (403/404 or similar). We only care that it fails and does
      // not return wishlist details.
      await api.functional.shoppingMall.customer.wishlists.at(connection, {
        wishlistId: wishlistIdOfA,
      });
    },
  );
}
