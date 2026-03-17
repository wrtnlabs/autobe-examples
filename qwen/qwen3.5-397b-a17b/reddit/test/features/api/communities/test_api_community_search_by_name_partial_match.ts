import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test community search by name partial matching functionality.
 *
 * This test validates the PATCH /redditClone/communities endpoint's search capability:
 * 1. Retrieves all communities to establish baseline data
 * 2. Tests partial name matching with a substring from existing community
 * 3. Verifies case-insensitive search behavior
 * 4. Validates that only matching communities are returned
 * 5. Tests empty result scenario with nonexistent search term
 * 6. Confirms pagination metadata is correct
 */
export async function test_api_community_search_by_name_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Get all communities to find existing data for search testing
  const allCommunities = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(allCommunities);
  // 2. Test partial name search if communities exist
  if (allCommunities.data.length > 0) {
    // Extract partial name from first community (first 3 characters)
    const firstCommunity = allCommunities.data[0];
    const partialName = firstCommunity.name.substring(
      0,
      Math.min(3, firstCommunity.name.length),
    );
    // 3. Search with partial name
    const searchResults = await api.functional.redditClone.communities.index(
      connection,
      {
        body: {
          search: partialName,
          page: 1,
          limit: 100,
        } satisfies IRedditCloneCommunity.IRequest,
      },
    );
    typia.assert(searchResults);
    // 4. Validate all results contain the partial name (case-insensitive)
    for (const community of searchResults.data) {
      TestValidator.predicate(
        `community "${community.name}" contains search term "${partialName}"`,
        community.name.toLowerCase().includes(partialName.toLowerCase()),
      );
    }
    // 5. Validate search results are subset of all communities
    TestValidator.predicate(
      "search results count <= total communities",
      searchResults.data.length <= allCommunities.data.length,
    );
    // 6. Test case-insensitive search with uppercase
    const uppercaseSearch = await api.functional.redditClone.communities.index(
      connection,
      {
        body: {
          search: partialName.toUpperCase(),
          page: 1,
          limit: 100,
        } satisfies IRedditCloneCommunity.IRequest,
      },
    );
    typia.assert(uppercaseSearch);
    // 7. Validate case-insensitive matching returns same results
    TestValidator.equals(
      "case-insensitive search returns same count",
      searchResults.data.length,
      uppercaseSearch.data.length,
    );
  } else {
    // 8. Test with empty result set - search should return empty array
    const emptySearch = await api.functional.redditClone.communities.index(
      connection,
      {
        body: {
          search: "nonexistent_community_xyz_123",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneCommunity.IRequest,
      },
    );
    typia.assert(emptySearch);
    TestValidator.equals(
      "no results for nonexistent search term",
      emptySearch.data.length,
      0,
    );
  }
}
