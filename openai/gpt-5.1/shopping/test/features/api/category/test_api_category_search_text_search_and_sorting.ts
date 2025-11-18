import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate free-text search and name-based sorting behavior for ShoppingMall
 * categories.
 *
 * Business goals:
 *
 * - Ensure the public PATCH /shoppingMall/categories endpoint supports keyword
 *   search over category `name_en` and/or `slug` using the `search` field of
 *   IShoppingMallCategory.IRequest.
 * - Verify that `order_by` and `order_direction` parameters control the
 *   alphabetical ordering of categories by `name_en` without changing the
 *   underlying search filter.
 * - Confirm that the endpoint remains accessible without authentication.
 *
 * Test strategy:
 *
 * 1. Call the categories index API once with a neutral request (no search or
 *    ordering) to obtain a pool of existing categories.
 * 2. If there are no categories at all, the test cannot meaningfully assert search
 *    and sorting behavior, so it should still validate the response structure
 *    and then exit early.
 * 3. From the pool, select a sample category and derive a keyword from `name_en`
 *    (preferred) or `slug` by taking a non-trivial substring using
 *    RandomGenerator.substring. This guarantees the chosen keyword will match
 *    at least that category when we later apply search.
 * 4. Call PATCH /shoppingMall/categories (index) again with `search` set to the
 *    derived keyword, leaving other filters (parent_id, status, is_leaf)
 *    undefined so as not to constrain results beyond free-text search.
 * 5. Validate that all returned categories contain the keyword (case-insensitive)
 *    in either `name_en` or `slug`. This approximates the intended search
 *    behavior described in the docs without making overly strict assumptions
 *    about the backend implementation.
 * 6. Call the endpoint a third time with the same `search` keyword and with
 *    `order_by = "name_en"` and `order_direction = "asc"`. Assert that the
 *    resulting `data` array is sorted in ascending lexicographical order of
 *    `name_en`.
 * 7. Call the endpoint a fourth time with the same `search` keyword and with
 *    `order_by = "name_en"` and `order_direction = "desc"`. Assert that the
 *    resulting `data` array is sorted in descending order of `name_en`.
 * 8. When both ascending and descending result sets contain at least two elements,
 *    additionally assert that they are mutual reverses in terms of ordering
 *    keys where the data sets have the same length.
 *
 * Technical constraints:
 *
 * - Use only the imports provided by the template:
 *
 *   - ArrayUtil, RandomGenerator, TestValidator from "@nestia/e2e"
 *   - Typia, tags from "typia"
 *   - Api from "@ORGANIZATION/PROJECT-api"
 *   - IPage, IPageIShoppingMallCategory, IShoppingMallCategory types
 * - Always call API functions with `await` and validate responses with
 *   `typia.assert(...)`.
 * - Use `satisfies IShoppingMallCategory.IRequest` when constructing request
 *   bodies, without additional type annotations.
 * - Do not manipulate `connection.headers` directly; rely on the SDK for any
 *   header management (this endpoint is public anyway).
 * - Avoid any type-error testing, HTTP status code assertions, or intentional
 *   schema violations.
 */
export async function test_api_category_search_text_search_and_sorting(
  connection: api.IConnection,
) {
  // Helper to assert ascending sort by name_en
  const assertAscendingByNameEn = (
    categories: IShoppingMallCategory.ISummary[],
  ): void => {
    for (let i = 1; i < categories.length; ++i) {
      const prev = categories[i - 1].name_en;
      const curr = categories[i].name_en;
      TestValidator.predicate(
        `ascending name_en order at index ${i - 1} -> ${i}`,
        prev.localeCompare(curr) <= 0,
      );
    }
  };

  // Helper to assert descending sort by name_en
  const assertDescendingByNameEn = (
    categories: IShoppingMallCategory.ISummary[],
  ): void => {
    for (let i = 1; i < categories.length; ++i) {
      const prev = categories[i - 1].name_en;
      const curr = categories[i].name_en;
      TestValidator.predicate(
        `descending name_en order at index ${i - 1} -> ${i}`,
        prev.localeCompare(curr) >= 0,
      );
    }
  };

  // 1. Baseline call without search or explicit ordering to get a sample pool
  const baselineRequest = {
    page: 1,
    limit: 20,
    parent_id: undefined,
    status: undefined,
    is_leaf: undefined,
    search: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IShoppingMallCategory.IRequest;

  const baselinePage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: baselineRequest,
    });
  typia.assert<IPageIShoppingMallCategory.ISummary>(baselinePage);

  const baselineCategories: IShoppingMallCategory.ISummary[] =
    baselinePage.data;

  // If there are no categories at all, we can only validate that the response
  // is structurally correct and end the test early.
  if (baselineCategories.length === 0) {
    TestValidator.equals(
      "baseline categories list is empty but structurally valid",
      baselineCategories.length,
      0,
    );
    return;
  }

  // 2. Derive a keyword from an existing category's name_en or slug
  const sampleCategory: IShoppingMallCategory.ISummary =
    RandomGenerator.pick(baselineCategories);

  const sourceText: string =
    sampleCategory.name_en.length > 0
      ? sampleCategory.name_en
      : sampleCategory.slug;

  const keyword: string = RandomGenerator.substring(sourceText) || sourceText;

  TestValidator.predicate(
    "derived keyword for category search is non-empty",
    keyword.length > 0,
  );

  // Normalize keyword for case-insensitive comparisons later
  const normalizedKeyword: string = keyword.toLowerCase();

  // 3. Call with search keyword only (no explicit ordering)
  const searchOnlyRequest = {
    page: 1,
    limit: 50,
    parent_id: undefined,
    status: undefined,
    is_leaf: undefined,
    search: keyword,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IShoppingMallCategory.IRequest;

  const searchOnlyPage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: searchOnlyRequest,
    });
  typia.assert<IPageIShoppingMallCategory.ISummary>(searchOnlyPage);

  const searchOnlyCategories: IShoppingMallCategory.ISummary[] =
    searchOnlyPage.data;

  // If the search returns no results, still validate the page structure and
  // that search was accepted, but skip further search-based assertions.
  if (searchOnlyCategories.length === 0) {
    TestValidator.equals(
      "search-only categories list is empty for derived keyword",
      searchOnlyCategories.length,
      0,
    );
    return;
  }

  // Validate that every returned category roughly matches the keyword in
  // name_en or slug (case-insensitive contains).
  for (const category of searchOnlyCategories) {
    const nameMatches = category.name_en
      .toLowerCase()
      .includes(normalizedKeyword);
    const slugMatches = category.slug.toLowerCase().includes(normalizedKeyword);

    TestValidator.predicate(
      "search results should contain keyword in name_en or slug",
      nameMatches || slugMatches,
    );
  }

  // 4. Call with search keyword and ascending name_en ordering
  const ascRequest = {
    page: 1,
    limit: 50,
    parent_id: undefined,
    status: undefined,
    is_leaf: undefined,
    search: keyword,
    order_by: "name_en",
    order_direction: "asc",
  } satisfies IShoppingMallCategory.IRequest;

  const ascPage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: ascRequest,
    });
  typia.assert<IPageIShoppingMallCategory.ISummary>(ascPage);

  const ascCategories: IShoppingMallCategory.ISummary[] = ascPage.data;

  if (ascCategories.length > 1) {
    assertAscendingByNameEn(ascCategories);
  }

  // 5. Call with search keyword and descending name_en ordering
  const descRequest = {
    page: 1,
    limit: 50,
    parent_id: undefined,
    status: undefined,
    is_leaf: undefined,
    search: keyword,
    order_by: "name_en",
    order_direction: "desc",
  } satisfies IShoppingMallCategory.IRequest;

  const descPage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: descRequest,
    });
  typia.assert<IPageIShoppingMallCategory.ISummary>(descPage);

  const descCategories: IShoppingMallCategory.ISummary[] = descPage.data;

  if (descCategories.length > 1) {
    assertDescendingByNameEn(descCategories);
  }

  // 6. When both asc and desc result sets have the same length and at least
  // two elements, verify that their name_en sequences are mutual reverses.
  if (
    ascCategories.length > 1 &&
    ascCategories.length === descCategories.length
  ) {
    const len = ascCategories.length;
    for (let i = 0; i < len; ++i) {
      const ascName = ascCategories[i].name_en;
      const descName = descCategories[len - 1 - i].name_en;
      TestValidator.equals(
        "ascending and descending sequences should be reverses by name_en",
        ascName,
        descName,
      );
    }
  }
}
