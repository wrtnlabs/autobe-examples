import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const searchConnection: api.IConnection = { host: connection.host };
  // Test 1: Search with no matching query should return empty results
  const emptySearch = await api.functional.redditPlatform.communities.index(
    searchConnection,
    {
      body: {
        search: "NonExistentCommunityXYZ123",
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search returns zero records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearch.data.length,
    0,
  );
  // Test 2: Search without query returns all communities
  const allCommunities = await api.functional.redditPlatform.communities.index(
    searchConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(allCommunities);
  // If communities exist, test partial name matching
  if (allCommunities.data.length > 0) {
    // Test partial name search
    const sampleCommunity = allCommunities.data[0];
    const partialName = sampleCommunity.name.substring(
      0,
      Math.max(3, Math.floor(sampleCommunity.name.length / 2)),
    );
    const partialSearch = await api.functional.redditPlatform.communities.index(
      searchConnection,
      {
        body: {
          search: partialName,
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
    typia.assert(partialSearch);
    // Verify search returns matching communities
    TestValidator.predicate(
      "partial search returns results",
      partialSearch.data.length > 0,
    );
    // Verify all returned communities contain the search term
    partialSearch.data.forEach((community) => {
      TestValidator.predicate(
        `community name contains search term "${partialName}"`,
        community.name.toLowerCase().includes(partialName.toLowerCase()),
      );
    });
  }
  // Test 3: Pagination metadata validation
  TestValidator.predicate(
    "pagination has valid current page",
    allCommunities.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    allCommunities.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allCommunities.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    allCommunities.pagination.pages >= 0,
  );
}
