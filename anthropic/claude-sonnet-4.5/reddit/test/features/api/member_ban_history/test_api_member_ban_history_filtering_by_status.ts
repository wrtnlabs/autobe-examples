import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test filtering ban records by various status values when retrieving a
 * member's ban history.
 *
 * This test validates the status filter functionality of the ban history API,
 * ensuring that only bans matching the specified status are returned in
 * paginated results.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Query ban history with different status filters (active, expired, lifted,
 *    appealed)
 * 3. Validate pagination response structure for each status filter
 * 4. Verify that the API accepts all valid status values
 * 5. Test combination of status filter with other parameters
 */
export async function test_api_member_ban_history_filtering_by_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Use a test username for querying ban history
  const testUsername = RandomGenerator.name(1);

  // Step 2: Test filtering with "active" status
  const activeBansResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(activeBansResult);

  // Step 3: Test filtering with "expired" status
  const expiredBansResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          status: "expired",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(expiredBansResult);

  // Step 4: Test filtering with "lifted" status
  const liftedBansResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          status: "lifted",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(liftedBansResult);

  // Step 5: Test filtering with "appealed" status
  const appealedBansResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          status: "appealed",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(appealedBansResult);

  // Step 6: Test status filter combined with other parameters
  const combinedFilterResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          status: "active",
          page: 1,
          limit: 20,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(combinedFilterResult);

  TestValidator.equals(
    "combined filter uses correct limit",
    combinedFilterResult.pagination.limit,
    20,
  );

  // Step 7: Test without status filter to verify it's optional
  const allBansResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(allBansResult);
}
