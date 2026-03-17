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

export async function test_api_community_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for community searches
  const searchConnection: api.IConnection = { host: connection.host };
  // 1. Test case-insensitive substring matching
  // Search for "tech" (lowercase)
  const techSearch = await api.functional.redditCommunity.communities.index(
    searchConnection,
    {
      body: {
        name: "tech",
      } satisfies IRedditCommunityCommunity.IRequest,
    },
  );
  typia.assert(techSearch);
  // Validate all returned communities have "tech" in their names (case-insensitive)
  for (const community of techSearch.data) {
    const nameLower = community.name.toLowerCase();
    TestValidator.predicate(
      `community ${community.id} name contains "tech" (case-insensitive)`,
      nameLower.includes("tech"),
    );
  }
  // 2. Test case insensitivity - "TECH" should return same communities as "tech"
  const upperTechSearch =
    await api.functional.redditCommunity.communities.index(searchConnection, {
      body: {
        name: "TECH",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(upperTechSearch);
  TestValidator.equals(
    "case insensitive search returns same count",
    techSearch.data.length,
    upperTechSearch.data.length,
  );
  // 3. Test partial match with different patterns
  const searchPatterns = ["talk", "discussion", "news", "hub", "world"];
  await ArrayUtil.asyncForEach(searchPatterns, async (pattern) => {
    const patternSearch =
      await api.functional.redditCommunity.communities.index(searchConnection, {
        body: {
          name: pattern,
        } satisfies IRedditCommunityCommunity.IRequest,
      });
    typia.assert(patternSearch);
    // Validate all results contain the search pattern
    for (const community of patternSearch.data) {
      const nameLower = community.name.toLowerCase();
      TestValidator.predicate(
        `community ${community.id} name contains "${pattern}" (case-insensitive)`,
        nameLower.includes(pattern.toLowerCase()),
      );
    }
  });
  // 4. Verify alphabetical sorting by name
  const allCommunities = await api.functional.redditCommunity.communities.index(
    searchConnection,
    {
      body: {},
    },
  );
  typia.assert(allCommunities);
  if (allCommunities.data.length > 1) {
    const names = allCommunities.data.map((c) => c.name);
    const sortedNames = [...names].sort();
    TestValidator.equals(
      "communities sorted alphabetically by name",
      JSON.stringify(names),
      JSON.stringify(sortedNames),
    );
  }
  // 5. Verify pagination metadata accuracy
  const paginatedSearch =
    await api.functional.redditCommunity.communities.index(searchConnection, {
      body: {
        name: "tech",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(paginatedSearch);
  // Verify pagination records match actual data count
  TestValidator.equals(
    "pagination records match filtered result count",
    paginatedSearch.pagination.records,
    paginatedSearch.data.length,
  );
  // Verify pages calculation is correct
  const expectedPages = Math.ceil(
    paginatedSearch.pagination.records / paginatedSearch.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation is correct",
    paginatedSearch.pagination.pages,
    expectedPages,
  );
  // 6. Test boundary condition: empty search returns all communities
  const allCommunitiesNoFilter =
    await api.functional.redditCommunity.communities.index(searchConnection, {
      body: {},
    });
  typia.assert(allCommunitiesNoFilter);
  TestValidator.equals(
    "empty search returns all communities",
    allCommunitiesNoFilter.data.length,
    allCommunities.data.length,
  );
  // 7. Verify search reduces result set (when pattern matches fewer than all)
  if (techSearch.data.length < allCommunities.data.length) {
    TestValidator.predicate(
      "search pattern reduces result set",
      techSearch.data.length < allCommunities.data.length,
    );
  }
}
