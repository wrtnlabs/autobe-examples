import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_search_no_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test with no communities (empty database scenario)
  // Search with a query that will not match any community names
  const nonMatchingQuery = "xyz123nonexistent";
  const searchBody: IRedditPlatformCommunity.IRequest = {
    searchQuery: nonMatchingQuery,
  };
  // 2. Execute search with non-matching query
  const startTime = Date.now();
  const noResultsResponse: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: searchBody,
    });
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  // 3. Validate response type
  typia.assert(noResultsResponse);
  // 4. Verify empty data array
  TestValidator.equals(
    "data array is empty for no-match query",
    noResultsResponse.data.length,
    0,
  );
  // 5. Verify pagination metadata for zero results
  const pagination: IPage.IPagination = noResultsResponse.pagination;
  TestValidator.equals(
    "records is 0 for no-match query",
    pagination.records,
    0,
  );
  TestValidator.equals("pages is 0 for no-match query", pagination.pages, 0);
  TestValidator.equals(
    "current page is 1 for no-match query",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is 20 (default) for no-match query",
    pagination.limit,
    20,
  );
  // 6. Validate response time (within 200ms per Section 628)
  TestValidator.predicate(
    "response time within 200ms for zero results",
    responseTime <= 200,
  );
  // 7. Test: Empty search query should return all active communities
  const emptyQueryBody: IRedditPlatformCommunity.IRequest = {};
  const allCommunitiesResponse: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: emptyQueryBody,
    });
  typia.assert(allCommunitiesResponse);
  // Verify empty query returns all communities (different from no-match)
  TestValidator.notEquals(
    "empty query should return different result than no-match",
    allCommunitiesResponse.data.length,
    0,
  );
  // 8. Test: Special character-only query should be rejected per Section 336
  const specialCharQuery: IRedditPlatformCommunity.IRequest = {
    searchQuery: "!@#$%",
  };
  await TestValidator.error(
    "special character-only query should be rejected",
    async () => {
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: specialCharQuery,
      });
    },
  );
  // 9. Test: Search with different sorting options still returns empty for no-match
  const searchWithSort: IRedditPlatformCommunity.IRequest = {
    searchQuery: "xyz123nonexistent",
    sortBy: "name",
    sortOrder: "asc",
  };
  const noMatchWithSort: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: searchWithSort,
    });
  typia.assert(noMatchWithSort);
  TestValidator.equals(
    "sorted search still returns empty for no-match",
    noMatchWithSort.data.length,
    0,
  );
  TestValidator.equals(
    "records should be 0 with sorting for no-match",
    noMatchWithSort.pagination.records,
    0,
  );
}
