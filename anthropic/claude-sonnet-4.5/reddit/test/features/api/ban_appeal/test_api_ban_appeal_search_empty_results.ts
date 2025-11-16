import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanAppeal";
import type { IRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanAppeal";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test ban appeal search when no appeals match the filter criteria.
 *
 * This test validates that the ban appeal search endpoint returns empty results
 * gracefully when no appeals exist or when filters match no records. It ensures
 * proper pagination metadata (zero records, zero pages) and valid response
 * structure even when the data array is empty.
 *
 * Test scenarios:
 *
 * 1. Search in a newly created community with no ban appeals
 * 2. Search with filters that cannot match any existing appeals
 * 3. Verify pagination metadata correctly reflects empty results
 * 4. Ensure response structure remains valid with empty data
 */
export async function test_api_ban_appeal_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
    nickname: RandomGenerator.name(),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create a new community (with no ban appeals)
  const communityData = {
    name: RandomGenerator.alphabets(10) satisfies string,
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: typia.random<(string & tags.Format<"uri">) | null | undefined>(),
    banner_url: typia.random<
      (string & tags.Format<"uri">) | null | undefined
    >(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // Step 3: Search for ban appeals with no filters (should return empty)
  const emptySearchResult =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: {} satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(emptySearchResult);

  // Validate empty results structure
  TestValidator.equals(
    "empty search returns zero data records",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination shows zero total records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination shows zero total pages",
    emptySearchResult.pagination.pages,
    0,
  );

  // Step 4: Search with specific filters that cannot match
  const nonExistentBanId = typia.random<string & tags.Format<"uuid">>();
  const filterSearchResult =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: {
          ban_id: nonExistentBanId,
          status: "pending",
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(filterSearchResult);

  TestValidator.equals(
    "filtered search with non-existent ban_id returns zero data",
    filterSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "filtered search pagination shows zero records",
    filterSearchResult.pagination.records,
    0,
  );

  // Step 5: Search with date range filters that have no data
  const futureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeResult =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: {
          submitted_after: futureDate,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(dateRangeResult);

  TestValidator.equals(
    "date range filter with no matching appeals returns empty",
    dateRangeResult.data.length,
    0,
  );

  // Step 6: Test pagination parameters with empty results
  const paginatedEmptyResult =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(paginatedEmptyResult);

  TestValidator.equals(
    "paginated empty search returns empty data",
    paginatedEmptyResult.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    paginatedEmptyResult.pagination.current >= 0,
  );
}
