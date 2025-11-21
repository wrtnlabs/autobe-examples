import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFavorite";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavorite";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test favorite search behavior when no favorites exist or when search criteria
 * match no results. Validates that the system properly handles empty result
 * sets and returns appropriate pagination information with zero records.
 */
export async function test_api_favorite_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create a new customer account with no favorites
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Perform initial favorite search with default parameters (should return empty)
  const emptySearchResult =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(emptySearchResult);

  // Validate empty result set structure
  TestValidator.equals(
    "empty search result should have zero records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search result should have empty data array",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    emptySearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match requested limit",
    emptySearchResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total pages should be 0 for zero records",
    emptySearchResult.pagination.pages,
    0,
  );

  // Step 3: Search with specific criteria that won't match any favorites
  const specificSearchResult =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {
        page: 1,
        limit: 5,
        search: "nonexistent_product_name_12345",
        sort_by: "product_name",
        order: "asc",
      } satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(specificSearchResult);

  // Validate specific search empty result set
  TestValidator.equals(
    "specific search should have zero records",
    specificSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "specific search should have empty data array",
    specificSearchResult.data.length,
    0,
  );

  // Step 4: Test pagination boundaries with empty results
  const paginationTestResult =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {
        page: 999, // Very high page number
        limit: 20,
      } satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(paginationTestResult);

  // Validate pagination behavior with empty results
  TestValidator.equals(
    "high page number should still return zero records",
    paginationTestResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "high page number should have empty data",
    paginationTestResult.data.length,
    0,
  );
  TestValidator.equals(
    "current page should be 1 for high page requests with no data",
    paginationTestResult.pagination.current,
    1, // Fixed: Should return page 1 when no records exist
  );

  // Step 5: Test date range search with impossible dates
  const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year in future
  const dateSearchResult =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {
        page: 1,
        limit: 10,
        date_from: futureDate.toISOString(),
        date_to: new Date(
          futureDate.getTime() + 24 * 60 * 60 * 1000,
        ).toISOString(), // Next day
      } satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(dateSearchResult);

  // Validate date range search with no matches
  TestValidator.equals(
    "future date search should have zero records",
    dateSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date search should have empty data",
    dateSearchResult.data.length,
    0,
  );

  // Step 6: Test category filter with non-existent category IDs
  const categorySearchResult =
    await api.functional.shoppingMall.customer.favorites.index(connection, {
      body: {
        page: 1,
        limit: 10,
        category_ids: [typia.random<string & tags.Format<"uuid">>()], // Random non-existent category
      } satisfies IShoppingMallFavorite.IRequest,
    });
  typia.assert(categorySearchResult);

  // Validate category filter with no matches
  TestValidator.equals(
    "non-existent category search should have zero records",
    categorySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent category search should have empty data",
    categorySearchResult.data.length,
    0,
  );
}
