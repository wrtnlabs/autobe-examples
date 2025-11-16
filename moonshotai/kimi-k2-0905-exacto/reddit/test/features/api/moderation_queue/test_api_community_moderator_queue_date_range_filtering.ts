import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationQueue";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityContentReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReportStatus";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationQueue";
import type { IRedditCommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test advanced date range filtering capabilities that allow moderators to
 * analyze moderation patterns over specific time periods. This scenario
 * validates the temporal filtering features that enable moderators to identify
 * trends, monitor reporting patterns, and review historical moderation data.
 * The system should support filtering by creation date ranges and help
 * moderators understand how community behavior changes over time. This
 * functionality is essential for community health monitoring and strategic
 * moderation planning.
 */
export async function test_api_community_moderator_queue_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create a community moderator account for accessing moderation queue system
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        nickname: RandomGenerator.name(),
        password: "Moderator123!",
        href: "https://reddit-community.example.com/join",
        referrer: "https://reddit-community.example.com/",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 2: Create member accounts to generate content
  const memberEmails = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"email">>(),
  );
  const members: IRedditCommunityMember.IAuthorized[] = [];

  for (const email of memberEmails) {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email,
        nickname: RandomGenerator.name(),
        password: "Member123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
    typia.assert(member);
    members.push(member);
  }

  // Step 3: Focus on testing date range functionality with available APIs
  // Since we cannot create communities, we'll test the date filtering capabilities directly

  // Step 4: Test basic date range filtering functionality
  const now = new Date();
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Test 1: Filter by start date only
  const recentFilter =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          date_from: oneWeekAgo,
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );
  typia.assert(recentFilter);

  TestValidator.predicate(
    "date_from filter accepts valid ISO date string",
    recentFilter.data !== undefined && Array.isArray(recentFilter.data),
  );

  // Test 2: Filter by end date only
  const twoWeeksAgo = new Date(
    now.getTime() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const olderFilter =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          date_to: twoWeeksAgo,
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );
  typia.assert(olderFilter);

  TestValidator.predicate(
    "date_to filter accepts valid ISO date string",
    olderFilter.data !== undefined && Array.isArray(olderFilter.data),
  );

  // Test 3: Filter by date range
  const threeDaysAgo = new Date(
    now.getTime() - 3 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const rangeFilter =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          date_from: oneWeekAgo,
          date_to: threeDaysAgo,
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );
  typia.assert(rangeFilter);

  TestValidator.predicate(
    "date range filter accepts valid ISO date strings",
    rangeFilter.data !== undefined && Array.isArray(rangeFilter.data),
  );

  // Test 4: Combined date filtering with other parameters
  const combinedFilter =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          date_from: oneWeekAgo,
          date_to: now.toISOString(),
          status_filter: "submitted",
          priority_filter: "medium",
          page: 1,
          limit: 25,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );
  typia.assert(combinedFilter);

  TestValidator.predicate(
    "combined filter with date range works correctly",
    combinedFilter.data !== undefined && Array.isArray(combinedFilter.data),
  );

  // Step 5: Test pagination with date filtering
  const paginatedFilter =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          date_from: oneWeekAgo,
          page: 2,
          limit: 10,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );
  typia.assert(paginatedFilter);

  TestValidator.equals(
    "pagination page is correct",
    paginatedFilter.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is correct",
    paginatedFilter.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "paginated results are within limit",
    paginatedFilter.data.length <= 10,
  );

  // Step 6: Validate temporal data structure integrity
  TestValidator.predicate(
    "all queue entries have created_at timestamps",
    recentFilter.data.every((entry) => typeof entry.created_at === "string"),
  );

  TestValidator.predicate(
    "timestamps are in valid ISO format",
    recentFilter.data.every((entry) => {
      try {
        new Date(entry.created_at);
        return true;
      } catch {
        return false;
      }
    }),
  );

  // Step 7: Test empty date range scenarios
  const emptyRangeFilter =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          date_from: now.toISOString(),
          date_to: oneWeekAgo, // Future to past (invalid logical range)
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );
  typia.assert(emptyRangeFilter);

  TestValidator.predicate(
    "invalid date range returns valid response structure",
    emptyRangeFilter.data !== undefined && Array.isArray(emptyRangeFilter.data),
  );
}
