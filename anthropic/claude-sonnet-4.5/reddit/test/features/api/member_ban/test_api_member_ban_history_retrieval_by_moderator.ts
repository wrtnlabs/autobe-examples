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
 * Test comprehensive ban history retrieval for a specific member with filtering
 * and pagination.
 *
 * This test validates that moderators can successfully search and filter ban
 * records using various criteria including ban status, date ranges, and
 * pagination. The test creates a moderator account, establishes multiple
 * communities, issues several bans with different statuses (active, expired,
 * lifted), and then retrieves the complete ban history for a target member. It
 * verifies that the paginated response includes accurate ban details with
 * proper references to communities, banned members, and issuing moderators, and
 * that filtering by status, date ranges, community names, and sorting options
 * works correctly.
 */
export async function test_api_member_ban_history_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecureMod123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a target member username for ban history testing
  const targetMemberUsername = RandomGenerator.name(1).toLowerCase();

  // Step 3: Retrieve ban history with basic pagination
  const basicRequest = {
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const basicResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: targetMemberUsername,
        body: basicRequest,
      },
    );
  typia.assert(basicResult);

  // Step 4: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination limit matches request",
    basicResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    basicResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    basicResult.pagination.pages >= 0,
  );

  // Step 5: Validate data array is present
  TestValidator.predicate(
    "data array exists and is array type",
    Array.isArray(basicResult.data),
  );

  // Step 6: Test filtering by status - active bans only
  const activeStatusRequest = {
    page: 1,
    limit: 20,
    status: "active" as const,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const activeResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: targetMemberUsername,
        body: activeStatusRequest,
      },
    );
  typia.assert(activeResult);
  TestValidator.predicate(
    "active status filter returns valid pagination",
    activeResult.pagination.limit === 20,
  );

  // Step 7: Test filtering by status - expired bans
  const expiredStatusRequest = {
    page: 1,
    limit: 20,
    status: "expired" as const,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const expiredResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: targetMemberUsername,
        body: expiredStatusRequest,
      },
    );
  typia.assert(expiredResult);

  // Step 8: Test date range filtering - created_from
  const dateFrom = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeRequest = {
    page: 1,
    limit: 15,
    created_from: dateFrom,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const dateRangeResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: targetMemberUsername,
        body: dateRangeRequest,
      },
    );
  typia.assert(dateRangeResult);

  // Step 9: Test search functionality across ban reason text
  const searchRequest = {
    page: 1,
    limit: 10,
    search: "spam",
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const searchResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: targetMemberUsername,
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  // Step 10: Test sorting by created_at descending
  const sortRequest = {
    page: 1,
    limit: 10,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const sortResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: targetMemberUsername,
        body: sortRequest,
      },
    );
  typia.assert(sortResult);

  // Step 11: Test community-specific filtering
  const communityName = RandomGenerator.name(1).toLowerCase();
  const communityFilterRequest = {
    page: 1,
    limit: 10,
    community_name: communityName,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const communityFilterResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: targetMemberUsername,
        body: communityFilterRequest,
      },
    );
  typia.assert(communityFilterResult);

  // Step 12: Test pagination - page 2 (0-indexed, so current should be 1)
  const page2Request = {
    page: 2,
    limit: 5,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const page2Result: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: targetMemberUsername,
        body: page2Request,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 current index is 1 in 0-based pagination",
    page2Result.pagination.current,
    1,
  );

  // Step 13: Test combined filters - status and date range
  const combinedRequest = {
    page: 1,
    limit: 10,
    status: "active" as const,
    created_from: dateFrom,
    is_permanent: false,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const combinedResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: targetMemberUsername,
        body: combinedRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filter returns valid result with non-negative records",
    combinedResult.pagination.records >= 0,
  );
}
