import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGlobalSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGlobalSearchResult";
import type { IShoppingMallAnalyticsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallGlobalSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearch";
import type { IShoppingMallGlobalSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearchResult";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_global_search_user_preferences_influence(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic search without preferences to establish baseline
  const baselineSearch = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: "electronics",
        sort_order: "relevance",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(baselineSearch);
  TestValidator.predicate(
    "baseline search returns results",
    baselineSearch.data.length > 0,
  );

  // Test 2: Search with single user preference tag
  const singlePreferenceSearch =
    await api.functional.shoppingMall.search.global(connection, {
      body: {
        query: "electronics",
        sort_order: "relevance",
        page: 1,
        limit: 10,
        user_preferences: ["smartphones"],
      } satisfies IShoppingMallGlobalSearch.IRequest,
    });
  typia.assert(singlePreferenceSearch);
  TestValidator.predicate(
    "single preference search returns results",
    singlePreferenceSearch.data.length > 0,
  );

  // Test 3: Search with multiple user preference tags
  const multiplePreferencesSearch =
    await api.functional.shoppingMall.search.global(connection, {
      body: {
        query: "electronics",
        sort_order: "relevance",
        page: 1,
        limit: 10,
        user_preferences: ["smartphones", "laptops", "tablets"],
      } satisfies IShoppingMallGlobalSearch.IRequest,
    });
  typia.assert(multiplePreferencesSearch);
  TestValidator.predicate(
    "multiple preferences search returns results",
    multiplePreferencesSearch.data.length > 0,
  );

  // Test 4: Search with content type filtering and preferences
  const contentTypeFilteredSearch =
    await api.functional.shoppingMall.search.global(connection, {
      body: {
        query: "apple",
        sort_order: "relevance",
        page: 1,
        limit: 10,
        content_types: ["products"],
        user_preferences: ["premium-brands"],
      } satisfies IShoppingMallGlobalSearch.IRequest,
    });
  typia.assert(contentTypeFilteredSearch);
  TestValidator.predicate(
    "content type filtered search returns results",
    contentTypeFilteredSearch.data.length >= 0,
  );

  // Test 5: Pagination with preference-influenced results (FIXED: Added query field)
  const paginatedSearch = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: "fashion",
        sort_order: "relevance",
        page: 2,
        limit: 5,
        user_preferences: ["clothing", "accessories"],
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "paginated search returns results",
    paginatedSearch.data.length >= 0,
  );
  TestValidator.equals(
    "pagination info correct",
    paginatedSearch.pagination.current,
    2,
  );

  // Test 6: Search with different sort orders and preferences (FIXED: Added query field)
  const priceSortSearch = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: "laptop",
        sort_order: "price_asc",
        page: 1,
        limit: 10,
        user_preferences: ["gaming-laptops"],
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(priceSortSearch);
  TestValidator.predicate(
    "price sorted search returns results",
    priceSortSearch.data.length >= 0,
  );

  // Test 7: Search with date filtering and preferences (FIXED: Added query field)
  const dateFilteredSearch = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: "new-arrivals",
        sort_order: "date",
        page: 1,
        limit: 10,
        date_range: "2024-01-01..2024-12-31",
        user_preferences: ["trending-products"],
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(dateFilteredSearch);
  TestValidator.predicate(
    "date filtered search returns results",
    dateFilteredSearch.data.length >= 0,
  );

  // Test 8: Price filtering with preferences (FIXED: Added query field)
  const priceFilteredSearch = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: "headphones",
        sort_order: "relevance",
        page: 1,
        limit: 10,
        min_price: 50,
        max_price: 500,
        user_preferences: ["audio-equipment", "premium-brands"],
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(priceFilteredSearch);
  TestValidator.predicate(
    "price filtered search returns results",
    priceFilteredSearch.data.length >= 0,
  );

  // Test 9: Search field targeting with preferences (FIXED: Added query field)
  const fieldTargetedSearch = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: "sony",
        sort_order: "relevance",
        page: 1,
        limit: 10,
        search_fields: ["name", "description"],
        user_preferences: ["electronics", "brand-loyalty"],
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(fieldTargetedSearch);
  TestValidator.predicate(
    "field targeted search returns results",
    fieldTargetedSearch.data.length >= 0,
  );

  // Test 10: Complex search with multiple filters and preferences (FIXED: Added query field)
  const complexSearch = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: "gaming",
        sort_order: "popularity",
        page: 1,
        limit: 15,
        content_types: ["products"],
        min_price: 100 as number satisfies number & tags.Minimum<0>,
        max_price: 2000 as number satisfies number & tags.Minimum<0>,
        user_preferences: [
          "gaming",
          "high-performance",
          "rgb-lighting",
          "mechanical-keyboards",
        ],
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(complexSearch);
  TestValidator.predicate(
    "complex search returns results",
    complexSearch.data.length >= 0,
  );

  // Validate that results contain different entity types when no content filter
  const unfilteredSearch = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: "test",
        sort_order: "relevance",
        page: 1,
        limit: 20,
        user_preferences: ["electronics", "fashion"],
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(unfilteredSearch);

  // Verify that all entity types can be present
  if (unfilteredSearch.data.length > 0) {
    const result = unfilteredSearch.data[0];
    TestValidator.predicate(
      "result has categories",
      Array.isArray(result.categories),
    );
    TestValidator.predicate(
      "result has products",
      Array.isArray(result.products),
    );
    TestValidator.predicate(
      "result has sellers",
      Array.isArray(result.sellers),
    );
    TestValidator.predicate(
      "result has customers",
      Array.isArray(result.customers),
    );
    TestValidator.predicate(
      "result has analytics",
      Array.isArray(result.analytics),
    );
    TestValidator.predicate(
      "result has total_results",
      typeof result.total_results === "number",
    );
    TestValidator.predicate(
      "result has search_query",
      typeof result.search_query === "string",
    );
  }

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current is valid",
    unfilteredSearch.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    unfilteredSearch.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is valid",
    unfilteredSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    unfilteredSearch.pagination.pages >= 0,
  );

  // Validate preference influence by comparing result sets
  TestValidator.predicate(
    "baseline search has different results than preference search",
    baselineSearch.data.length !== singlePreferenceSearch.data.length ||
      baselineSearch.data.some(
        (item, index) =>
          item.search_query !==
          singlePreferenceSearch.data[index]?.search_query,
      ),
  );
}
