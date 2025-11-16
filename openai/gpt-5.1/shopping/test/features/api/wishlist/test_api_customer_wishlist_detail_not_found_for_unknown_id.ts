import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Ensure wishlist detail endpoint returns 404 for unknown wishlistId.
 *
 * Business goal: Validate that an authenticated customer, who may already have
 * at least one real wishlist, receives a consistent not-found HTTP error when
 * requesting details for a wishlist that does not exist. The ID is a
 * syntactically correct UUID but does not correspond to any wishlist owned by
 * the customer (or ideally any wishlist at all).
 *
 * Steps:
 *
 * 1. Register a new customer using /auth/customer/join.
 * 2. Optionally create a real wishlist to verify the account and wishlist
 *    subsystem are functional.
 * 3. Generate a fresh UUID value that has never been used as a wishlistId.
 * 4. Call GET /shoppingMall/customer/wishlists/{wishlistId} with this random UUID.
 * 5. Assert that the call fails with HttpError status 404 using
 *    TestValidator.httpError.
 */
export async function test_api_customer_wishlist_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Register a new customer using /auth/customer/join.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Optionally create a real wishlist to verify wishlist subsystem.
  const createBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallWishlist.ICreate;

  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createBody,
    });
  typia.assert(createdWishlist);

  // 3. Generate a fresh UUID value that has never been used as a wishlistId.
  const unknownWishlistId = typia.random<string & tags.Format<"uuid">>();

  // 4 & 5. Call detail endpoint with unknown ID and expect 404.
  await TestValidator.httpError(
    "wishlist detail should return 404 for unknown id",
    404,
    async () => {
      await api.functional.shoppingMall.customer.wishlists.at(connection, {
        wishlistId: unknownWishlistId,
      });
    },
  );
}
