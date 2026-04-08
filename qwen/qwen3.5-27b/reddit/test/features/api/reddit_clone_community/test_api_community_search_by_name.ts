import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test community search functionality with partial name matching and pagination.
 *
 * Validates the complete community search workflow including case-insensitive partial matching, sorting options, pagination controls, and empty result handling. Ensures that search results are correctly filtered, ordered, and paginated according to the specified criteria.
 *
 * Special attention is given to verifying that partial name matching works correctly across different case variations, that sorting options produce the expected order, and that pagination metadata accurately reflects the total result set.
 *
 * 1. Search with a common term to retrieve multiple communities.
 * 2. Validate all returned communities contain the search term in their names.
 * 3. Test search with non-existent term returning empty results.
 * 4. Test pagination with search results and validate metadata.
 * 5. Test sorting options (name ASC/DESC, subscriber_count DESC, created_at DESC).
 * 6. Validate sorting order correctness for each sort field.
 * 7. Test case-insensitive search functionality.
 * 8. Validate pagination metadata consistency and calculations.
 */
export async function test_api_community_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Test search with a common term
  const searchBody = {
    search: "Community",
    page: 1,
    limit: 10,
    sort: "name",
    direction: "ASC" as const,
  } satisfies IRedditCloneCommunity.IRequest;
  const searchResult = await api.functional.redditClone.communities.index(
    connection,
    { body: searchBody },
  );
  typia.assert(searchResult);
  // Validate search results structure
  TestValidator.predicate(
    "search returns valid pagination data",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "search returns valid limit",
    searchResult.pagination.limit >= 1,
  );
  // Validate all returned communities contain the search term (case-insensitive)
  for (const community of searchResult.data) {
    TestValidator.predicate(
      `community name "${community.name}" contains search term "${searchBody.search}" (case-insensitive)`,
      community.name.toLowerCase().includes(searchBody.search!.toLowerCase()),
    );
  }
  // Test search with non-existent term
  const noMatchSearchBody = {
    search: "NonExistentSearchTerm12345XYZ",
    page: 1,
    limit: 10,
  } satisfies IRedditCloneCommunity.IRequest;
  const noMatchResult = await api.functional.redditClone.communities.index(
    connection,
    { body: noMatchSearchBody },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "search with non-existent term returns empty data array",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 for empty search",
    noMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0 for empty search",
    noMatchResult.pagination.pages,
    0,
  );
  // Test pagination with search
  const paginatedSearchBody = {
    search: "Community",
    page: 1,
    limit: 5,
    sort: "created_at",
    direction: "DESC" as const,
  } satisfies IRedditCloneCommunity.IRequest;
  const paginatedResult = await api.functional.redditClone.communities.index(
    connection,
    { body: paginatedSearchBody },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination current page matches request",
    paginatedResult.pagination.current,
    paginatedSearchBody.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedResult.pagination.limit,
    paginatedSearchBody.limit,
  );
  TestValidator.predicate(
    "pagination returns data within limit on first page",
    paginatedResult.data.length <= paginatedSearchBody.limit!,
  );
  // Test sorting by name ascending
  const sortByNameAscBody = {
    search: "Community",
    page: 1,
    limit: 10,
    sort: "name",
    direction: "ASC" as const,
  } satisfies IRedditCloneCommunity.IRequest;
  const sortByNameAscResult =
    await api.functional.redditClone.communities.index(connection, {
      body: sortByNameAscBody,
    });
  typia.assert(sortByNameAscResult);
  // Validate name ascending order
  for (let i = 1; i < sortByNameAscResult.data.length; i++) {
    TestValidator.predicate(
      `name at index ${i} is greater than or equal to name at index ${i - 1} (ASC order)`,
      sortByNameAscResult.data[i].name >= sortByNameAscResult.data[i - 1].name,
    );
  }
  // Test sorting by name descending
  const sortByNameDescBody = {
    search: "Community",
    page: 1,
    limit: 10,
    sort: "name",
    direction: "DESC" as const,
  } satisfies IRedditCloneCommunity.IRequest;
  const sortByNameDescResult =
    await api.functional.redditClone.communities.index(connection, {
      body: sortByNameDescBody,
    });
  typia.assert(sortByNameDescResult);
  // Validate name descending order
  for (let i = 1; i < sortByNameDescResult.data.length; i++) {
    TestValidator.predicate(
      `name at index ${i} is less than or equal to name at index ${i - 1} (DESC order)`,
      sortByNameDescResult.data[i].name <=
        sortByNameDescResult.data[i - 1].name,
    );
  }
  // Test sorting by subscriber_count descending
  const sortBySubscribersBody = {
    search: "Community",
    page: 1,
    limit: 10,
    sort: "subscriber_count",
    direction: "DESC" as const,
  } satisfies IRedditCloneCommunity.IRequest;
  const sortBySubscribersResult =
    await api.functional.redditClone.communities.index(connection, {
      body: sortBySubscribersBody,
    });
  typia.assert(sortBySubscribersResult);
  // Validate subscriber_count descending order
  for (let i = 1; i < sortBySubscribersResult.data.length; i++) {
    TestValidator.predicate(
      `subscriber_count at index ${i} is less than or equal to index ${i - 1} (DESC order)`,
      sortBySubscribersResult.data[i].subscriber_count <=
        sortBySubscribersResult.data[i - 1].subscriber_count,
    );
  }
  // Test sorting by created_at descending
  const sortByCreatedAtBody = {
    search: "Community",
    page: 1,
    limit: 10,
    sort: "created_at",
    direction: "DESC" as const,
  } satisfies IRedditCloneCommunity.IRequest;
  const sortByCreatedAtResult =
    await api.functional.redditClone.communities.index(connection, {
      body: sortByCreatedAtBody,
    });
  typia.assert(sortByCreatedAtResult);
  // Validate created_at descending order (newest first)
  for (let i = 1; i < sortByCreatedAtResult.data.length; i++) {
    const prevDate = new Date(sortByCreatedAtResult.data[i - 1].created_at);
    const currDate = new Date(sortByCreatedAtResult.data[i].created_at);
    TestValidator.predicate(
      `created_at at index ${i} is less than or equal to index ${i - 1} (DESC order)`,
      currDate.getTime() <= prevDate.getTime(),
    );
  }
  // Test case-insensitive search with uppercase
  const caseInsensitiveSearchBody = {
    search: "COMMUNITY",
    page: 1,
    limit: 10,
  } satisfies IRedditCloneCommunity.IRequest;
  const caseInsensitiveResult =
    await api.functional.redditClone.communities.index(connection, {
      body: caseInsensitiveSearchBody,
    });
  typia.assert(caseInsensitiveResult);
  TestValidator.predicate(
    "case-insensitive search with uppercase returns results",
    caseInsensitiveResult.data.length > 0,
  );
  // Validate all results from case-insensitive search contain the term
  for (const community of caseInsensitiveResult.data) {
    TestValidator.predicate(
      `community name "${community.name}" matches case-insensitive search "${caseInsensitiveSearchBody.search}"`,
      community.name
        .toLowerCase()
        .includes(caseInsensitiveSearchBody.search!.toLowerCase()),
    );
  }
  // Test case-insensitive search with mixed case
  const mixedCaseSearchBody = {
    search: "cOmMuNiTy",
    page: 1,
    limit: 10,
  } satisfies IRedditCloneCommunity.IRequest;
  const mixedCaseResult = await api.functional.redditClone.communities.index(
    connection,
    { body: mixedCaseSearchBody },
  );
  typia.assert(mixedCaseResult);
  TestValidator.predicate(
    "case-insensitive search with mixed case returns results",
    mixedCaseResult.data.length > 0,
  );
  // Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination pages is calculated correctly from records and limit",
    paginatedResult.pagination.pages ===
      Math.ceil(
        paginatedResult.pagination.records / paginatedResult.pagination.limit,
      ),
  );
  // Test second page pagination
  if (paginatedResult.pagination.pages >= 2) {
    const secondPageBody = {
      search: "Community",
      page: 2,
      limit: 5,
      sort: "created_at",
      direction: "DESC" as const,
    } satisfies IRedditCloneCommunity.IRequest;
    const secondPageResult = await api.functional.redditClone.communities.index(
      connection,
      {
        body: secondPageBody,
      },
    );
    typia.assert(secondPageResult);
    TestValidator.equals(
      "second page current page is 2",
      secondPageResult.pagination.current,
      2,
    );
    // Validate no duplicate communities between pages
    const firstPageIds = new Set(paginatedResult.data.map((c) => c.id));
    const duplicates = secondPageResult.data.filter((c) =>
      firstPageIds.has(c.id),
    );
    TestValidator.equals(
      "no duplicate communities between pages",
      duplicates.length,
      0,
    );
  }
}
