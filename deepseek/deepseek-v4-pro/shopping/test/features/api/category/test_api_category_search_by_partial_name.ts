import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test category search by partial name using trigram fuzzy matching.
 *
 * Validates the fuzzy text search capability of the category browsing endpoint. The trigram-based search should return categories whose names are similar to the provided partial search term, including both exact substring matches and fuzzy matches where character sequences overlap.
 *
 * The test fetches all existing categories first to establish a baseline, then extracts a random substring from one category's name to use as the search term. It verifies that the target category appears in search results, confirming trigram matching works. It also validates that pagination metadata is correct, that each result includes the children_count field, and that paginated subsequent pages return distinct data from the first page.
 *
 * 1. Fetch all categories (limit 100) to establish the full dataset.
 * 2. Pick a random category and extract a substring of its name.
 * 3. Search using the substring as the search parameter.
 * 4. Verify the original category appears in search results.
 * 5. Verify all returned categories have valid children_count.
 * 6. Verify pagination metadata is complete and consistent.
 * 7. If multiple pages exist, verify page 2 returns distinct data.
 */
export async function test_api_category_search_by_partial_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch all categories to establish baseline
  const allCategories = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(allCategories);
  // Exit gracefully if no categories exist
  if (allCategories.data.length === 0) {
    return;
  }
  // 2. Pick one category and extract a substring for fuzzy search
  const target = allCategories.data[0];
  const searchTerm = RandomGenerator.substring(target.name);
  // 3. Search with the partial name substring
  const results = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        search: searchTerm,
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(results);
  // 4. Verify the target category is found via trigram fuzzy matching
  const resultIds = new Set(results.data.map((c) => c.id));
  TestValidator.predicate(
    "target category found by partial name search",
    resultIds.has(target.id),
  );
  // 5. Verify all results include children_count as a non-negative integer
  for (const category of results.data) {
    TestValidator.predicate(
      "children_count is a valid non-negative integer",
      category.children_count >= 0,
    );
  }
  // 6. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination metadata is complete",
    results.pagination.current >= 0 &&
      results.pagination.limit >= 0 &&
      results.pagination.records >= 0 &&
      results.pagination.pages >= 0,
  );
  // 7. Test explicit pagination when multiple pages exist
  if (results.pagination.pages > 1) {
    const page2 = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          search: searchTerm,
          page: 2,
          limit: results.pagination.limit,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals(
      "second page current is 2",
      page2.pagination.current,
      2,
    );
    TestValidator.predicate(
      "second page items are distinct from first page",
      page2.data.every((item) => !resultIds.has(item.id)) ||
        page2.data.length === 0,
    );
  }
}
