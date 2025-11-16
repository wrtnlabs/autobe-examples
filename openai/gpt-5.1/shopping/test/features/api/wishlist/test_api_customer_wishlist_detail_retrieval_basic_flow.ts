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
 * Happy-path: customer can retrieve detail of their own wishlist by ID.
 *
 * Business flow:
 *
 * 1. Register a new customer via auth.customer.join (POST /auth/customer/join).
 *
 *    - Use typia.random<IShoppingMallCustomerAuth.IJoin>() for join body.
 *    - Capture returned IShoppingMallCustomer.IAuthorized.
 *    - Rely on SDK to attach Authorization header; do NOT touch connection.headers.
 * 2. Create a wishlist for this authenticated customer via
 *    shoppingMall.customer.wishlists.create (POST
 *    /shoppingMall/customer/wishlists).
 *
 *    - Use an explicit, recognizable name such as "Birthday Wishlist" instead of
 *         fully random text to simplify assertions.
 *    - Request body must satisfy IShoppingMallWishlist.ICreate.
 * 3. Call shoppingMall.customer.wishlists.at (GET
 *    /shoppingMall/customer/wishlists/{wishlistId}) using the id from the
 *    create response.
 * 4. Validate type correctness of both create and at responses using typia.assert.
 * 5. Business validations using TestValidator:
 *
 *    - The retrieved wishlist id equals the created wishlist id.
 *    - The retrieved name equals the originally requested name.
 *    - The retrieved customer.id equals the authenticated customer.customer.id (from
 *         IShoppingMallCustomer.IAuthorized.customer.id).
 *    - Items is either undefined or an empty array for a brand new wishlist. Do not
 *         assume the server always returns an empty array; accept both
 *         behaviors.
 *    - IsDefault is a boolean; do not assert its specific value because platform
 *         rules (default wishlist semantics) are not guaranteed here.
 *    - CreatedAt and updatedAt are non-empty ISO date-time strings.
 *
 * Constraints and anti-patterns:
 *
 * - Do NOT manipulate connection.headers at all; the join() SDK function already
 *   injects Authorization.
 * - Do NOT add any new import statements; use only what the template provides.
 * - Do NOT perform any type-error tests (no wrong DTO shapes, no `as any`).
 * - Always await API calls and use typia.assert() on non-void responses.
 */
export async function test_api_customer_wishlist_detail_retrieval_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const joinBody = typia.random<IShoppingMallCustomerAuth.IJoin>();

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a wishlist with recognizable name
  const wishlistName = "Birthday Wishlist";
  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: wishlistName,
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(createdWishlist);

  // 3. Retrieve wishlist detail by id
  const retrievedWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.at(connection, {
      wishlistId: createdWishlist.id,
    });
  typia.assert(retrievedWishlist);

  // 4. Business validations
  TestValidator.equals(
    "retrieved wishlist id matches created wishlist id",
    retrievedWishlist.id,
    createdWishlist.id,
  );

  TestValidator.equals(
    "retrieved wishlist name matches requested name",
    retrievedWishlist.name,
    wishlistName,
  );

  TestValidator.equals(
    "wishlist owner customer.id matches authenticated customer id",
    retrievedWishlist.customer.id,
    authorized.customer.id,
  );

  // items should be either undefined or an empty array for a fresh wishlist
  if (retrievedWishlist.items === undefined) {
    TestValidator.predicate(
      "items is undefined for a fresh wishlist (acceptable)",
      true,
    );
  } else {
    TestValidator.equals(
      "items array is empty for a fresh wishlist",
      retrievedWishlist.items.length,
      0,
    );
  }

  // createdAt and updatedAt should be non-empty ISO date-time strings
  TestValidator.predicate(
    "createdAt is a non-empty ISO date-time string",
    retrievedWishlist.createdAt.length > 0,
  );

  TestValidator.predicate(
    "updatedAt is a non-empty ISO date-time string",
    retrievedWishlist.updatedAt.length > 0,
  );
}
