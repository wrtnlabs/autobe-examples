import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivity";

export async function test_api_analytics_user_behavior_temporal_analysis(
  connection: api.IConnection,
) {
  // 1. Set up moderator authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: typia.random<string & tags.Format<"uuid">>(),
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: true,
          can_warn_users: true,
          can_pin_posts: true,
          can_edit_rules: true,
          can_manage_moderators: false,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([
          typia.random<string & tags.Format<"uuid">>(),
        ]),
        appointed_by: typia.random<string & tags.Format<"uuid">>(),
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Test temporal analytics with various date ranges

  // Test 2.1: Last 24 hours filter
  const last24HoursResponse =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          date_from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          date_to: new Date().toISOString(),
          activity_type: "post_created,comment_created,post_voted",
          page: 1,
          limit: 10,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(last24HoursResponse);
  TestValidator.equals(
    "24-hour analytics should have pagination info",
    last24HoursResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "24-hour analytics should have 10 items per page",
    last24HoursResponse.pagination.limit,
    10,
  );

  // Test 2.2: Specific date range analysis
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7); // 7 days ago
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // yesterday

  const weeklyResponse =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          date_from: startDate.toISOString(),
          date_to: endDate.toISOString(),
          activity_type: "post_created,comment_created",
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(weeklyResponse);
  TestValidator.predicate(
    "Weekly analysis should return data",
    weeklyResponse.data.length >= 0,
  );

  // Test 2.3: Monthly trend analysis
  const monthStart = new Date();
  monthStart.setDate(1); // First day of current month
  monthStart.setHours(0, 0, 0, 0);

  const monthlyResponse =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          date_from: monthStart.toISOString(),
          date_to: new Date().toISOString(),
          activity_type: "post_voted,comment_voted,community_subscribed",
          page: 1,
          limit: 50,
          order_by: "activity_type",
          order_direction: "asc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(monthlyResponse);
  TestValidator.equals(
    "Monthly analysis should have correct pagination",
    monthlyResponse.pagination.current,
    1,
  );

  // Test 2.4: Different activity types filtering
  const votingResponse =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          activity_type: "post_voted",
          page: 1,
          limit: 25,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(votingResponse);
  TestValidator.equals(
    "Voting activities should have correct limit",
    votingResponse.pagination.limit,
    25,
  );

  // Test 2.5: Test data structure validation
  if (last24HoursResponse.data.length > 0) {
    const sampleActivity = last24HoursResponse.data[0];
    TestValidator.equals(
      "Activity should have required properties",
      typeof sampleActivity.id,
      "string",
    );
    TestValidator.equals(
      "Activity type should be string",
      typeof sampleActivity.activity_type,
      "string",
    );
    TestValidator.equals(
      "Activity description should be string",
      typeof sampleActivity.activity_description,
      "string",
    );
    TestValidator.equals(
      "Created at should be valid date-time",
      typeof sampleActivity.created_at,
      "string",
    );
    TestValidator.equals(
      "Target community ID should be UUID format",
      typeof sampleActivity.target_community_id,
      "string",
    );
  }

  // Test 2.6: Pagination validation
  const secondPageResponse =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          activity_type: "post_created,comment_created",
          page: 2,
          limit: 5,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "Second page should have current page as 2",
    secondPageResponse.pagination.current,
    2,
  );

  // Test 2.7: Edge case - empty date range (future dates)
  const futureStart = new Date();
  futureStart.setFullYear(futureStart.getFullYear() + 1); // Next year
  const futureEnd = new Date();
  futureEnd.setFullYear(futureEnd.getFullYear() + 1);
  futureEnd.setDate(futureEnd.getDate() + 30); // 30 days next year

  const emptyResponse =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          date_from: futureStart.toISOString(),
          date_to: futureEnd.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "Future date range should return empty results",
    emptyResponse.data.length,
    0,
  );

  // Test 2.8: Maximum limit validation
  const maxLimitResponse =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          activity_type: "post_created",
          page: 1,
          limit: 100, // Maximum allowed
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "Maximum limit should be respected",
    maxLimitResponse.pagination.limit,
    100,
  );
}
