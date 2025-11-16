import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test filtering moderation actions by specific date ranges to analyze
 * moderation patterns over time.
 *
 * This test validates time-based filtering capabilities essential for reviewing
 * moderation activity during specific periods, supporting temporal audit trail
 * queries and moderation oversight.
 *
 * Workflow:
 *
 * 1. Create moderator account for authentication and moderation
 * 2. Create community for moderation context
 * 3. Create member account for content creation
 * 4. Create multiple posts as moderation targets
 * 5. Query moderation actions with various date range filters
 * 6. Validate date filtering behavior and boundary conditions
 *
 * Note: This test validates the search API's date filtering capabilities.
 * Moderation actions are created implicitly by the system when moderators take
 * actions.
 *
 * Validation points:
 *
 * - From_date filter correctly includes only actions on or after timestamp
 * - To_date filter correctly includes only actions on or before timestamp
 * - Combined filters create accurate time windows
 * - Actions outside range are excluded
 * - ISO 8601 date-time format compliance
 * - Pagination works with date-filtered results
 */
export async function test_api_moderation_action_search_with_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with stored credentials
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });

  // Step 4: Create posts (potential moderation targets)
  await ArrayUtil.asyncRepeat(3, async () => {
    const post = await api.functional.redditCommunity.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "text",
          body: RandomGenerator.content({ paragraphs: 2 }),
          url: null,
          image_url: null,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
  });

  // Switch back to moderator for querying actions
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Define test date ranges
  const now = new Date();
  const pastDate = new Date(now.getTime() - 86400000).toISOString(); // 1 day ago
  const futureDate = new Date(now.getTime() + 86400000).toISOString(); // 1 day future
  const veryOldDate = new Date("2020-01-01T00:00:00Z").toISOString();

  // Step 5: Query all actions without filters (baseline)
  const allActions =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(allActions);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    allActions.pagination.current >= 0 &&
      allActions.pagination.limit > 0 &&
      allActions.pagination.records >= 0 &&
      allActions.pagination.pages >= 0,
  );

  // Step 6: Test from_date filter (actions after past date)
  const fromDateResults =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          page: 1,
          limit: 100,
          from_date: pastDate,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(fromDateResults);

  // Validate from_date filtering: all returned actions should be on or after from_date
  fromDateResults.data.forEach((action) => {
    TestValidator.predicate(
      `action created_at should be on or after from_date`,
      new Date(action.created_at).getTime() >= new Date(pastDate).getTime(),
    );
  });

  // Step 7: Test to_date filter (actions before future date)
  const toDateResults =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          page: 1,
          limit: 100,
          to_date: futureDate,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(toDateResults);

  // Validate to_date filtering: all returned actions should be on or before to_date
  toDateResults.data.forEach((action) => {
    TestValidator.predicate(
      `action created_at should be on or before to_date`,
      new Date(action.created_at).getTime() <= new Date(futureDate).getTime(),
    );
  });

  // Step 8: Test combined from_date and to_date (time window)
  const timeWindowResults =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          page: 1,
          limit: 100,
          from_date: pastDate,
          to_date: futureDate,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(timeWindowResults);

  // Validate time window: all actions should be within the range
  timeWindowResults.data.forEach((action) => {
    const actionTime = new Date(action.created_at).getTime();
    const fromTime = new Date(pastDate).getTime();
    const toTime = new Date(futureDate).getTime();

    TestValidator.predicate(
      `action created_at should be within time window`,
      actionTime >= fromTime && actionTime <= toTime,
    );
  });

  // Step 9: Test empty range (no actions should exist in very old date range)
  const emptyRangeResults =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          page: 1,
          limit: 100,
          from_date: veryOldDate,
          to_date: veryOldDate,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(emptyRangeResults);

  // Validate empty range returns no data or only actions at exact timestamp
  emptyRangeResults.data.forEach((action) => {
    const actionTime = new Date(action.created_at).getTime();
    const rangeTime = new Date(veryOldDate).getTime();

    TestValidator.predicate(
      `actions in exact range should match the timestamp`,
      actionTime === rangeTime,
    );
  });

  // Step 10: Test pagination with date filters
  const paginatedResults =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          page: 1,
          limit: 10,
          from_date: pastDate,
          to_date: futureDate,
          sort_by: "created_at",
          order: "desc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(paginatedResults);

  // Validate pagination works correctly with filters
  TestValidator.predicate(
    "paginated results should respect limit",
    paginatedResults.data.length <= 10,
  );

  TestValidator.predicate(
    "pagination metadata should be consistent",
    paginatedResults.pagination.current === 1 &&
      paginatedResults.pagination.limit === 10,
  );
}
