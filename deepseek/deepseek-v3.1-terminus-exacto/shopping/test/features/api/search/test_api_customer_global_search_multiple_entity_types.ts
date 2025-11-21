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
 * Test global search across multiple entity types including products,
 * categories, and articles. Customer performs a comprehensive search specifying
 * multiple entity types and validates that results are properly categorized by
 * type with correct entity references and relevance scoring. Verifies
 * cross-entity search capability and type-based result organization.
 */
export async function test_api_customer_global_search_multiple_entity_types(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as customer
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Perform global search with multiple entity types
  const searchRequest = {
    query: "electronics smartphone laptop",
    entityTypes: ["products", "categories", "articles"] as const,
    pagination: {
      page: 1,
      limit: 20,
      sortBy: "relevance",
      sortOrder: "desc" as const,
    } satisfies IPagination,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const searchResults =
    await api.functional.shoppingMall.customer.search.global.search(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResults);

  // Step 3: Validate search results structure
  TestValidator.equals(
    "search results should have pagination metadata",
    typeof searchResults.pagination,
    "object",
  );
  TestValidator.equals(
    "search results should have data array",
    Array.isArray(searchResults.data),
    true,
  );

  // Step 4: Validate pagination structure
  const pagination = searchResults.pagination;
  TestValidator.predicate(
    "pagination should have current page",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have limit",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination should have total records",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have total pages",
    pagination.pages >= 0,
  );

  // Step 5: Validate individual search result items
  if (searchResults.data.length > 0) {
    const firstResult = searchResults.data[0];
    typia.assert(firstResult);

    TestValidator.predicate(
      "search result should have type",
      typeof firstResult.type === "string" && firstResult.type.length > 0,
    );
    TestValidator.predicate(
      "search result should have valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstResult.id,
      ),
    );
    TestValidator.predicate(
      "search result should have title",
      typeof firstResult.title === "string" && firstResult.title.length > 0,
    );
    TestValidator.predicate(
      "search result should have relevance score",
      typeof firstResult.relevance_score === "number" &&
        firstResult.relevance_score >= 0,
    );

    // Step 6: Verify entity type categorization
    const validEntityTypes = ["products", "categories", "articles"] as const;
    TestValidator.predicate(
      "search result type should be one of the specified entity types",
      validEntityTypes.includes(
        firstResult.type as (typeof validEntityTypes)[number],
      ),
    );

    // Step 7: Validate entity references
    if (firstResult.entity_reference !== undefined) {
      TestValidator.predicate(
        "entity reference should be a string",
        typeof firstResult.entity_reference === "string",
      );
    }

    // Step 8: Test with different search parameters
    const specificSearch = {
      query: "technology",
      entityTypes: ["products", "articles"] as const,
      filters: {
        priceRange: {
          min: 10,
          max: 1000,
        } satisfies IPriceRange,
      } satisfies ISearchFilters,
      pagination: {
        page: 1,
        limit: 10,
        sortBy: "price",
        sortOrder: "asc" as const,
      } satisfies IPagination,
    } satisfies IShoppingMallGlobalSearch.IRequest;

    const filteredResults =
      await api.functional.shoppingMall.customer.search.global.search(
        connection,
        {
          body: specificSearch,
        },
      );
    typia.assert(filteredResults);

    TestValidator.predicate(
      "filtered search should return results",
      Array.isArray(filteredResults.data),
    );
  }
}
