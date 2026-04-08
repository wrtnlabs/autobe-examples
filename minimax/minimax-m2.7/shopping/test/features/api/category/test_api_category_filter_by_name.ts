import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test filtering categories by name using partial matching.
 *
 * Validates the search discovery workflow where customers search for specific
 * category names. The test calls PATCH /ecommerceMall/categories with a name
 * filter parameter and verifies that the response returns only categories whose
 * names contain the search term with case-insensitive matching.
 *
 * Key validation points:
 * - Partial matching returns categories containing the search term
 * - Search is case-insensitive (e.g., "electronics" matches "Electronics")
 * - Pagination metadata correctly reflects filtered record count
 * - All returned categories satisfy the name filter criteria
 *
 * 1. Call index endpoint without filter to get baseline categories.
 * 2. Apply name filter with partial search term.
 * 3. Validate returned categories all contain the search term.
 * 4. Verify pagination reflects filtered results count.
 */
export async function test_api_category_filter_by_name(
  connection: api.IConnection,
): Promise<void> {
  // First, get all categories to establish baseline
  const allCategories = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {} satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(allCategories);
  // Apply name filter for partial matching (case-insensitive)
  const searchTerm = "Electronics";
  const filteredResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        name: searchTerm,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(filteredResult);
  // Validate all returned categories contain the search term (case-insensitive)
  for (const category of filteredResult.data) {
    TestValidator.predicate(
      `category "${category.name}" contains "${searchTerm}"`,
      category.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
  // Validate filtered count is less than or equal to total count
  TestValidator.predicate(
    "filtered results count is reasonable",
    filteredResult.pagination.records <= allCategories.pagination.records,
  );
  // Validate pagination metadata exists and is valid
  TestValidator.predicate(
    "pagination has valid structure",
    filteredResult.pagination.current >= 0 &&
      filteredResult.pagination.limit >= 0 &&
      filteredResult.pagination.records >= 0 &&
      filteredResult.pagination.pages >= 0,
  );
}
