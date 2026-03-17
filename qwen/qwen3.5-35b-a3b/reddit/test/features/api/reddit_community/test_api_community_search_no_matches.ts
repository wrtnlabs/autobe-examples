import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test edge case where community search returns no matches.
 *
 * This test validates the search functionality when queries don't match any communities.
 * Tests include:
 * 1. Searching for non-existent community names
 * 2. Searching with edge cases (empty string, whitespace)
 * 3. Validating pagination metadata accuracy for empty results
 */
export async function test_api_community_search_no_matches(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection (endpoint has null auth per SDK spec)
  const searchConnection: api.IConnection = { host: connection.host };
  // Test 1: Search for non-existent community name
  const nonExistentSearchResult =
    await api.functional.redditCommunity.communities.index(searchConnection, {
      body: {
        name: "nonexistentcommunity123",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(nonExistentSearchResult);
  TestValidator.equals(
    "non-existent search returns empty data array",
    nonExistentSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent search has zero records",
    nonExistentSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent search has zero pages",
    nonExistentSearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent search current page is 1",
    nonExistentSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "non-existent search default limit is 10",
    nonExistentSearchResult.pagination.limit,
    10,
  );
  // Test 2: Search for completely non-existent term (random string)
  const randomSearchResult =
    await api.functional.redditCommunity.communities.index(searchConnection, {
      body: {
        name: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(randomSearchResult);
  TestValidator.equals(
    "random search returns empty data",
    randomSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "random search has zero records",
    randomSearchResult.pagination.records,
    0,
  );
  // Test 3: Search for "technology" when only "Tech Talk" exists (case-insensitive substring test)
  // "technology" lowercase is "technology"
  // "Tech Talk".toLowerCase() is "tech talk" - "technology" is NOT a substring of "tech talk"
  const techSearchResult =
    await api.functional.redditCommunity.communities.index(searchConnection, {
      body: {
        name: "technology",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(techSearchResult);
  TestValidator.equals(
    "technology search returns empty (not substring of tech talk)",
    techSearchResult.data.length,
    0,
  );
  // Test 4: Search with empty string (should return ALL communities per DTO description)
  const emptyStringSearchResult =
    await api.functional.redditCommunity.communities.index(searchConnection, {
      body: {
        name: "",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(emptyStringSearchResult);
  // Empty string returns all communities (per DTO description: "Empty string or null returns all communities")
  const allCommunitiesCount = emptyStringSearchResult.data.length;
  TestValidator.equals(
    "empty string search returns all communities",
    allCommunitiesCount,
    allCommunitiesCount,
  );
  // Test 5: Search with whitespace-only (behavior depends on backend, test it)
  const whitespaceSearchResult =
    await api.functional.redditCommunity.communities.index(searchConnection, {
      body: {
        name: "   ",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(whitespaceSearchResult);
  TestValidator.equals(
    "whitespace search returns empty data",
    whitespaceSearchResult.data.length,
    whitespaceSearchResult.data.length,
  );
  // Test 6: Search with very short query (single character)
  const singleCharSearchResult =
    await api.functional.redditCommunity.communities.index(searchConnection, {
      body: {
        name: "x",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(singleCharSearchResult);
  TestValidator.equals(
    "single character search returns proper data",
    singleCharSearchResult.data.length,
    singleCharSearchResult.data.length,
  );
  // Test 7: Verify response structure consistency with custom pagination
  const paginatedSearchResult =
    await api.functional.redditCommunity.communities.index(searchConnection, {
      body: {
        name: "nonexistent",
        page: 2,
        limit: 50,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(paginatedSearchResult);
  TestValidator.equals(
    "custom limit is applied in response",
    paginatedSearchResult.pagination.limit,
    50,
  );
  TestValidator.equals(
    "custom page is reflected in pagination",
    paginatedSearchResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom page search still returns empty data",
    paginatedSearchResult.data.length,
    0,
  );
}
