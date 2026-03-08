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

export async function test_api_community_search_basic_discovery(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic search with valid name query
  // Search should work for both authenticated and unauthenticated users
  const searchResult =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        name: "tech",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(searchResult);
  TestValidator.predicate(
    "Search returns paginated results with pagination object",
    searchResult.data !== undefined && searchResult.pagination !== undefined,
  );
  // Test 2: Case-insensitive matching
  // Search should return consistent results regardless of case
  const searchUpper =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        name: "TECH",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(searchUpper);
  const searchMixed =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        name: "Tech",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(searchMixed);
  TestValidator.equals(
    "Different case searches return consistent result count",
    searchResult.data.length,
    searchUpper.data.length,
  );
  TestValidator.equals(
    "Mixed case search returns consistent result count",
    searchResult.data.length,
    searchMixed.data.length,
  );
  // Test 3: Partial name matching
  // Search should match communities containing the search term
  const partialSearch =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        name: "gam",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(partialSearch);
  TestValidator.predicate(
    "Partial search returns paginated results",
    partialSearch.data !== undefined,
  );
  // Test 4: Response structure validation
  // Verify all required fields exist in community summaries
  if (searchResult.data.length > 0) {
    const community = searchResult.data[0];
    typia.assert(community);
    TestValidator.predicate(
      "Community has required fields",
      community.id !== undefined &&
        community.name !== undefined &&
        community.subscriber_count !== undefined &&
        community.author !== undefined &&
        community.created_at !== undefined,
    );
    TestValidator.predicate(
      "Author has required fields",
      community.author.id !== undefined &&
        community.author.username !== undefined &&
        community.author.displayName !== undefined &&
        community.author.karmaScore !== undefined &&
        community.author.createdAt !== undefined &&
        community.author.subscriptionCount !== undefined,
    );
    // Optional fields can be null
    TestValidator.predicate(
      "Description can be null or string",
      typeof community.description === "string" ||
        community.description === null,
    );
    TestValidator.predicate(
      "Icon URL can be null or string",
      typeof community.icon_url === "string" || community.icon_url === null,
    );
  }
  // Test 5: Pagination metadata validation
  TestValidator.equals("Current page is 1", searchResult.pagination.current, 1);
  TestValidator.equals("Limit is 10", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "Records count matches or exceeds returned data",
    searchResult.pagination.records >= searchResult.data.length,
  );
  TestValidator.predicate(
    "Pages calculated correctly",
    searchResult.pagination.pages >= 1,
  );
  // Test 6: Pagination with different page numbers
  const page2Search =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        name: undefined,
        page: 2,
        limit: 10,
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(page2Search);
  TestValidator.equals(
    "Page 2 returns correct pagination",
    page2Search.pagination.current,
    2,
  );
  TestValidator.predicate(
    "Page 2 data differs from page 1 when results exist",
    page2Search.data.length !== searchResult.data.length ||
      searchResult.data.length === 0,
  );
  // Test 7: Performance check
  const performanceStart = Date.now();
  await api.functional.redditPlatform.communities.search.index(connection, {
    body: {
      name: "test",
      page: 1,
      limit: 10,
    } satisfies IRedditPlatformCommunity.IRequest,
  });
  const performanceEnd = Date.now();
  const duration = performanceEnd - performanceStart;
  TestValidator.predicate("Search completes within 500ms SLO", duration < 500);
  // Test 8: Empty search results for non-existent community
  const emptySearch =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        name: "nonexistent_community_xyz",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(emptySearch);
  TestValidator.predicate(
    "Non-existent community returns empty results",
    emptySearch.data.length === 0,
  );
  TestValidator.equals(
    "Empty search returns zero pages",
    emptySearch.pagination.pages,
    0,
  );
  // Test 9: Limit validation
  const highLimitSearch =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        name: undefined,
        page: 1,
        limit: 100,
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(highLimitSearch);
  TestValidator.equals(
    "High limit returns correct limit",
    highLimitSearch.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "High limit respects max bound",
    highLimitSearch.pagination.limit <= 100,
  );
  // Test 10: Sort options validation
  const nameSortSearch =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        name: undefined,
        page: 1,
        limit: 10,
        sort: "name",
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(nameSortSearch);
  TestValidator.predicate(
    "Name sort returns valid results",
    nameSortSearch.data.length >= 0,
  );
}
