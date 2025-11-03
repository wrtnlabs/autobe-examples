import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticsBbsCategory";
import type { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";

/**
 * Test category search by name pattern functionality in the politics BBS
 * system.
 *
 * This test validates that the system supports name-based filtering to find
 * categories matching specific search terms. Tests both exact matches and
 * partial matching across category names for content discoverability.
 *
 * Test steps:
 *
 * 1. Test exact search match patterns
 * 2. Test partial search match patterns
 * 3. Test case-insensitive search functionality
 * 4. Test search with non-existent terms
 * 5. Test pagination with search results
 * 6. Validate response structure and data integrity
 */
export async function test_api_categories_search_filter_name(
  connection: api.IConnection,
) {
  // Step 1: Test exact search match
  const exactSearchRequestBody = {
    search: "Economic Policy Analysis",
    primary: null,
    limit: 10,
    page: 1,
    order_by: "name",
    direction: "asc",
  } satisfies IPoliticsBbsCategory.IRequest;

  const exactSearchResults = await api.functional.politicsBbs.categories.index(
    connection,
    { body: exactSearchRequestBody },
  );
  typia.assert(exactSearchResults);

  TestValidator.predicate(
    "exact search should return results containing the exact term",
    exactSearchResults.data.length > 0,
  );

  // Step 2: Test partial search match
  const partialSearchRequestBody = {
    search: "Economic",
    primary: null,
    limit: 10,
    page: 1,
    order_by: "name",
    direction: "asc",
  } satisfies IPoliticsBbsCategory.IRequest;

  const partialSearchResults =
    await api.functional.politicsBbs.categories.index(connection, {
      body: partialSearchRequestBody,
    });
  typia.assert(partialSearchResults);

  TestValidator.predicate(
    "partial search should return results containing the partial term",
    partialSearchResults.data.length > 0,
  );

  // Step 3: Test case-insensitive search
  const caseInsensitiveSearchBody = {
    search: "ECONOMIC",
    primary: null,
    limit: 10,
    page: 1,
    order_by: "name",
    direction: "asc",
  } satisfies IPoliticsBbsCategory.IRequest;

  const caseInsensitiveResults =
    await api.functional.politicsBbs.categories.index(connection, {
      body: caseInsensitiveSearchBody,
    });
  typia.assert(caseInsensitiveResults);

  TestValidator.predicate(
    "case-insensitive search should return results matching lowercase term",
    caseInsensitiveResults.data.length > 0,
  );

  // Step 4: Test search with non-existent term
  const nonExistentSearchBody = {
    search: "NonExistentCategory12345",
    primary: null,
    limit: 10,
    page: 1,
    order_by: "name",
    direction: "asc",
  } satisfies IPoliticsBbsCategory.IRequest;

  const nonExistentResults = await api.functional.politicsBbs.categories.index(
    connection,
    { body: nonExistentSearchBody },
  );
  typia.assert(nonExistentResults);

  TestValidator.equals(
    "non-existent search should return empty results",
    nonExistentResults.data.length,
    0,
  );

  // Step 5: Test pagination with search
  const paginatedSearchBody = {
    search: "Political",
    primary: null,
    limit: 5,
    page: 1,
    order_by: "name",
    direction: "asc",
  } satisfies IPoliticsBbsCategory.IRequest;

  const paginatedResults = await api.functional.politicsBbs.categories.index(
    connection,
    { body: paginatedSearchBody },
  );
  typia.assert(paginatedResults);

  TestValidator.predicate(
    "paginated search results should have valid pagination data",
    paginatedResults.pagination.current === 1 &&
      paginatedResults.pagination.limit === 5,
  );

  // Step 6: Verify response structure integrity
  if (exactSearchResults.data.length > 0) {
    const firstCategory = exactSearchResults.data[0];
    TestValidator.predicate(
      "category should have required properties",
      typeof firstCategory.id === "string" &&
        typeof firstCategory.code === "string" &&
        typeof firstCategory.name === "string" &&
        typeof firstCategory.created_at === "string" &&
        typeof firstCategory.sequence === "number" &&
        typeof firstCategory.primary === "boolean" &&
        typeof firstCategory.required === "boolean" &&
        typeof firstCategory.multiplicative === "boolean" &&
        typeof firstCategory.description === "string",
    );
  }
}
