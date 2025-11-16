import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test search functionality for community moderators with pagination and
 * filtering.
 *
 * This test validates the moderator search API's ability to list and filter
 * community moderators, supporting pagination, sorting, and search query
 * parameters.
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create a test community
 * 3. Test moderator listing without filters (baseline)
 * 4. Test search functionality with query parameter
 * 5. Test pagination parameters (page, limit)
 * 6. Test sorting options (username ascending/descending)
 * 7. Test combination of search with pagination and sorting
 * 8. Verify empty results handling for non-existent searches
 */
export async function test_api_community_moderators_search(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        nickname: "TestModerator",
        href: "https://test.example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://test.example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a test community
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: "Test Community for Moderator Search",
          description:
            "A test community for validating moderator search and listing functionality",
          rules: "Be respectful and follow community guidelines",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Test baseline moderator listing without filters
  const baselineResult: IPageIRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: community.name,
        body: {} satisfies IRedditCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(baselineResult);

  TestValidator.predicate(
    "baseline listing returns pagination metadata",
    baselineResult.pagination !== null &&
      baselineResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "baseline listing returns data array",
    Array.isArray(baselineResult.data),
  );

  // Step 4: Test search functionality with query parameter
  const searchQuery = moderator.username.substring(0, 3);
  const searchResult: IPageIRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: community.name,
        body: {
          search: searchQuery,
        } satisfies IRedditCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(searchResult);

  TestValidator.predicate(
    "search result has valid structure",
    searchResult.data !== null && searchResult.data !== undefined,
  );

  // Step 5: Test pagination parameters
  const paginatedResult: IPageIRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(paginatedResult);

  TestValidator.equals(
    "pagination limit is applied",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    (paginatedResult.pagination.current satisfies number as number) >= 0,
  );

  // Step 6: Test sorting options - username ascending
  const sortedAscResult: IPageIRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: community.name,
        body: {
          sort: "username_asc",
        } satisfies IRedditCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(sortedAscResult);

  TestValidator.predicate(
    "sorted ascending result has data",
    Array.isArray(sortedAscResult.data),
  );

  // Test sorting - username descending
  const sortedDescResult: IPageIRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: community.name,
        body: {
          sort: "username_desc",
        } satisfies IRedditCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(sortedDescResult);

  TestValidator.predicate(
    "sorted descending result has data",
    Array.isArray(sortedDescResult.data),
  );

  // Step 7: Test combination of search with pagination and sorting
  const combinedResult: IPageIRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: community.name,
        body: {
          search: moderator.username.substring(0, 2),
          page: 1,
          limit: 5,
          sort: "assigned_at_desc",
        } satisfies IRedditCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(combinedResult);

  TestValidator.predicate(
    "combined search respects pagination",
    combinedResult.data.length <= 5,
  );
  TestValidator.equals(
    "combined search pagination limit matches",
    combinedResult.pagination.limit,
    5,
  );

  // Step 8: Test empty results handling
  const emptySearchResult: IPageIRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: community.name,
        body: {
          search: "nonexistent_moderator_xyz_12345",
        } satisfies IRedditCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(emptySearchResult);

  TestValidator.predicate(
    "empty search returns valid pagination structure",
    emptySearchResult.pagination !== null &&
      emptySearchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "empty search returns empty data array",
    Array.isArray(emptySearchResult.data),
  );
}
