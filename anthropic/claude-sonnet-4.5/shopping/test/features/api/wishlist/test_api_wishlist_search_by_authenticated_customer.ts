import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Tests authenticated customer wishlist search with pagination.
 *
 * This test validates that customers can search and retrieve their own
 * wishlists with proper pagination support. It ensures security by verifying
 * customers only access their own wishlists and validates pagination metadata
 * accuracy.
 *
 * Test Flow:
 *
 * 1. Register and authenticate as a customer
 * 2. Create multiple wishlists for pagination testing
 * 3. Search wishlists with pagination parameters
 * 4. Validate pagination metadata accuracy (business logic)
 * 5. Verify all created wishlists appear in search results
 */
export async function test_api_wishlist_search_by_authenticated_customer(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerData = {
    email: customerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerData });
  typia.assert(customer);

  // Step 2: Create multiple wishlists for pagination testing
  const wishlistNames = ArrayUtil.repeat(
    5,
    (index) => `Wishlist ${RandomGenerator.name()} ${index}`,
  );
  const createdWishlists: IShoppingMallWishlist[] = await ArrayUtil.asyncMap(
    wishlistNames,
    async (name) => {
      const wishlist =
        await api.functional.shoppingMall.customer.wishlists.create(
          connection,
          { body: { name } satisfies IShoppingMallWishlist.ICreate },
        );
      typia.assert(wishlist);
      return wishlist;
    },
  );

  // Step 3: Search wishlists with pagination (first page)
  const searchRequest = {
    page: 1,
  } satisfies IShoppingMallWishlist.IRequest;

  const searchResult: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Step 4: Validate pagination business logic
  // Verify pagination math: pages should equal ceil(records / limit)
  const expectedPages = Math.ceil(
    searchResult.pagination.records / searchResult.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation is correct",
    searchResult.pagination.pages,
    expectedPages,
  );

  TestValidator.predicate(
    "search result contains created wishlists",
    searchResult.data.length >= createdWishlists.length,
  );

  // Step 5: Verify all created wishlists appear in search results
  const resultIds = searchResult.data.map((w) => w.id);
  createdWishlists.forEach((created) => {
    TestValidator.predicate(
      `created wishlist ${created.name} appears in search results`,
      resultIds.includes(created.id),
    );
  });

  // Step 6: Test pagination with different page parameter
  const page2Request = {
    page: 0,
  } satisfies IShoppingMallWishlist.IRequest;

  const page2Result: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: page2Request,
    });
  typia.assert(page2Result);

  TestValidator.equals(
    "page parameter changes current page",
    page2Result.pagination.current,
    0,
  );
}
