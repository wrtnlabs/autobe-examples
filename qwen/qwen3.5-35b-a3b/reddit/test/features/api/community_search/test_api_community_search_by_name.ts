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

export async function test_api_community_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Use base connection directly since no authorization needed (endpoint allows null auth)
  // Test 1: Search for "tech" - case-insensitive partial match
  const searchResultTech =
    await api.functional.redditPlatform.communities.index(connection, {
      body: { name_search: "tech" } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(searchResultTech);
  TestValidator.equals(
    "search tech - response structure valid",
    searchResultTech.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "search tech - pagination exists",
    searchResultTech.pagination !== undefined,
    true,
  );
  // Test 2: Case-insensitive search - "TECH" should return same count as "tech"
  const searchResultTechUpper =
    await api.functional.redditPlatform.communities.index(connection, {
      body: { name_search: "TECH" } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(searchResultTechUpper);
  TestValidator.equals(
    "case-insensitive search - same count as lowercase",
    searchResultTechUpper.data.length,
    searchResultTech.data.length,
  );
  // Test 3: Partial match - "sc" should match communities containing "sc" in name
  const searchResultSC = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: { name_search: "sc" } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(searchResultSC);
  TestValidator.equals(
    "partial match search - response structure valid",
    searchResultSC.pagination !== undefined,
    true,
  );
  // Test 4: Empty search - no name_search parameter should return all communities
  const allCommunities = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {} satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(allCommunities);
  TestValidator.equals(
    "empty search - returns all communities",
    allCommunities.data.length >= searchResultTech.data.length,
    true,
  );
  TestValidator.equals(
    "empty search - pagination records matches array length",
    allCommunities.pagination.records >= allCommunities.data.length,
    true,
  );
  // Test 5: Pagination with search - combine name_search with page and limit
  const paginatedResult = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {
        name_search: "tech",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination - current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination - limit is respected",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination - records count is non-negative",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination - pages is calculated correctly",
    paginatedResult.pagination.pages >= 1,
  );
  // Test 6: Verify default sorting by subscriber_count DESC (popularity)
  if (paginatedResult.data.length > 1) {
    TestValidator.predicate(
      "default sorting - first result has highest subscriber_count",
      paginatedResult.data[0].subscriber_count >=
        paginatedResult.data[1].subscriber_count,
    );
  }
  // Test 7: Search with different case variations
  const searchResultMixed =
    await api.functional.redditPlatform.communities.index(connection, {
      body: { name_search: "TeCh" } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(searchResultMixed);
  TestValidator.equals(
    "mixed case search - same count as lowercase",
    searchResultMixed.data.length,
    searchResultTech.data.length,
  );
  // Test 8: Verify response structure for each returned community
  if (searchResultTech.data.length > 0) {
    const firstCommunity = searchResultTech.data[0];
    typia.assert(firstCommunity);
    TestValidator.predicate(
      "community - has valid id",
      firstCommunity.id !== undefined,
    );
    TestValidator.predicate(
      "community - has name",
      firstCommunity.name !== undefined && firstCommunity.name.length > 0,
    );
    TestValidator.predicate(
      "community - has subscriber_count",
      typeof firstCommunity.subscriber_count === "number",
    );
    TestValidator.predicate(
      "community - has owner",
      firstCommunity.owner !== undefined,
    );
    TestValidator.predicate(
      "community - has created_at",
      firstCommunity.created_at !== undefined,
    );
    TestValidator.predicate(
      "community - has updated_at",
      firstCommunity.updated_at !== undefined,
    );
  }
  // Test 9: Verify pagination metadata consistency
  TestValidator.predicate(
    "pagination - pages calculated correctly",
    paginatedResult.pagination.pages ===
      Math.ceil(
        paginatedResult.pagination.records / paginatedResult.pagination.limit,
      ),
  );
  // Test 10: Search with different limit values
  const smallLimitResult =
    await api.functional.redditPlatform.communities.index(connection, {
      body: {
        name_search: "tech",
        limit: 5,
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(smallLimitResult);
  TestValidator.equals(
    "small limit - limit is 5",
    smallLimitResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "small limit - data length respects limit",
    smallLimitResult.data.length <= 5,
  );
}
