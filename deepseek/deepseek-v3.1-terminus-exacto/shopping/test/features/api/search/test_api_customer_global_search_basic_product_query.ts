import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGlobalSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGlobalSearchResult";
import type { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import type { IPriceRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPriceRange";
import type { ISearchFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchFilters";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallGlobalSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearch";
import type { IShoppingMallGlobalSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearchResult";

/**
 * Test basic product search functionality for authenticated customers. Customer
 * performs a global search for products using a simple query string and
 * validates that product results are returned with proper relevance scoring and
 * pagination. Verifies that search respects customer authentication and returns
 * appropriate product information including titles, descriptions, and relevance
 * scores.
 */
export async function test_api_customer_global_search_basic_product_query(
  connection: api.IConnection,
) {
  // Step 1: Customer authentication via join operation
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "securePassword123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Perform basic global search with realistic product query
  const searchQuery = "electronics smartphone";
  const searchResults =
    await api.functional.shoppingMall.customer.search.global.search(
      connection,
      {
        body: {
          query: searchQuery,
          entityTypes: ["products"] as const,
          pagination: {
            page: 1,
            limit: 10,
            sortBy: "relevance",
            sortOrder: "desc",
          } satisfies IPagination,
        } satisfies IShoppingMallGlobalSearch.IRequest,
      },
    );
  typia.assert(searchResults);

  // Step 3: Validate search results structure and pagination
  TestValidator.equals(
    "search results should have pagination info",
    searchResults.pagination,
    {
      current: 1,
      limit: 10,
      records: searchResults.pagination.records,
      pages: searchResults.pagination.pages,
    } satisfies IPage.IPagination,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    searchResults.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    searchResults.pagination.pages >= 0,
  );

  // Step 4: Verify relevance scoring and result metadata
  if (searchResults.data.length > 0) {
    const firstResult = searchResults.data[0];
    typia.assert(firstResult);

    TestValidator.predicate(
      "search result should have valid type",
      firstResult.type.length > 0,
    );

    TestValidator.predicate(
      "search result should have title",
      firstResult.title.length > 0,
    );

    TestValidator.predicate(
      "search result should have non-negative relevance score",
      firstResult.relevance_score >= 0,
    );

    // Validate all results have consistent structure
    for (const result of searchResults.data) {
      typia.assert(result);
      TestValidator.predicate(
        `result ${result.id} should have valid type`,
        result.type.length > 0,
      );
      TestValidator.predicate(
        `result ${result.id} should have title`,
        result.title.length > 0,
      );
      TestValidator.predicate(
        `result ${result.id} should have non-negative relevance score`,
        result.relevance_score >= 0,
      );
    }
  }

  // Step 5: Test pagination functionality by requesting second page
  const secondPageResults =
    await api.functional.shoppingMall.customer.search.global.search(
      connection,
      {
        body: {
          query: searchQuery,
          entityTypes: ["products"] as const,
          pagination: {
            page: 2,
            limit: 10,
            sortBy: "relevance",
            sortOrder: "desc",
          } satisfies IPagination,
        } satisfies IShoppingMallGlobalSearch.IRequest,
      },
    );
  typia.assert(secondPageResults);

  TestValidator.equals(
    "second page should have correct page number",
    secondPageResults.pagination.current,
    2,
  );

  // Validate that pagination works correctly
  if (searchResults.data.length > 0 && secondPageResults.data.length > 0) {
    TestValidator.notEquals(
      "first and second page results should be different",
      searchResults.data[0].id,
      secondPageResults.data[0].id,
    );
  }
}
