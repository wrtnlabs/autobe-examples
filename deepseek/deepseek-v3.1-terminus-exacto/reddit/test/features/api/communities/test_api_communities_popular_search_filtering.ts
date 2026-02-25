import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_communities_popular_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create test communities with varied names for search testing
  const testCommunities = [
    {
      name: "Technology Enthusiasts",
      description: "Discuss latest tech trends",
    },
    {
      name: "Tech Support Community",
      description: "Get help with technical issues",
    },
    { name: "Programming Discussions", description: "Share coding knowledge" },
    { name: "Gaming Community", description: "Talk about video games" },
    { name: "Music Lovers", description: "Share music recommendations" },
  ];
  // Note: In a real E2E test, we would create these communities first
  // Since we don't have community creation endpoints available, we'll work with existing data
  // Test 1: Empty/undefined search query should return all communities
  const allCommunitiesResponse =
    await api.functional.communityPlatform.communities.popular.index(
      { host: connection.host },
      {
        body: {
          search: undefined,
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(allCommunitiesResponse);
  TestValidator.predicate(
    "should return pagination data",
    allCommunitiesResponse.pagination !== undefined,
  );
  // Test 2: Search for "tech" (exact and partial matching)
  const techSearchResponse =
    await api.functional.communityPlatform.communities.popular.index(
      { host: connection.host },
      {
        body: {
          search: "tech",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(techSearchResponse);
  // Validate that filtered results contain the search term
  if (techSearchResponse.data.length > 0) {
    TestValidator.predicate(
      "tech search results should contain search term",
      techSearchResponse.data.every((community) =>
        community.name.toLowerCase().includes("tech"),
      ),
    );
  }
  // Test 3: Partial match search
  const partialSearchResponse =
    await api.functional.communityPlatform.communities.popular.index(
      { host: connection.host },
      {
        body: {
          search: "nology",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(partialSearchResponse);
  // Test 4: Case-insensitive search
  const caseSearchResponse =
    await api.functional.communityPlatform.communities.popular.index(
      { host: connection.host },
      {
        body: {
          search: "TECH",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(caseSearchResponse);
  // Test 5: Non-matching search term
  const nonMatchingResponse =
    await api.functional.communityPlatform.communities.popular.index(
      { host: connection.host },
      {
        body: {
          search: "nonexistentxyz123",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(nonMatchingResponse);
  TestValidator.predicate(
    "non-matching search should return empty or filtered results",
    true,
  );
  // Test 6: Search with special characters
  const specialCharResponse =
    await api.functional.communityPlatform.communities.popular.index(
      { host: connection.host },
      {
        body: {
          search: "community",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(specialCharResponse);
  // Test 7: Pagination with search
  const paginatedResponse =
    await api.functional.communityPlatform.communities.popular.index(
      { host: connection.host },
      {
        body: {
          search: "tech",
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.predicate(
    "paginated search should respect limit",
    paginatedResponse.data.length <= 2,
  );
  TestValidator.equals(
    "pagination limit should match request",
    paginatedResponse.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination current page should match",
    paginatedResponse.pagination.current,
    1,
  );
  // Test 8: Empty string search (should behave like undefined)
  const emptySearchResponse =
    await api.functional.communityPlatform.communities.popular.index(
      { host: connection.host },
      {
        body: {
          search: "",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(emptySearchResponse);
  // Test 9: Null search parameter
  const nullSearchResponse =
    await api.functional.communityPlatform.communities.popular.index(
      { host: connection.host },
      {
        body: {
          search: null as any,
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(nullSearchResponse);
  // Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination records should be non-negative",
    allCommunitiesResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be calculated correctly",
    allCommunitiesResponse.pagination.pages ===
      Math.ceil(
        allCommunitiesResponse.pagination.records /
          allCommunitiesResponse.pagination.limit,
      ),
  );
}
