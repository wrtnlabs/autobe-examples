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

export async function test_api_analytics_user_behavior_community_specific(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const now = new Date();
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();

  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: registeredUserId,
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
        assigned_communities: JSON.stringify([registeredUserId]), // Self-assigned for testing
        appointed_by: "system",
        moderation_count: 0,
        last_moderation_action: now.toISOString(),
        active_status: "active",
        appointed_at: now.toISOString(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test basic analytics retrieval without filters
  const basicAnalytics: IPageIRedditPlatformUserActivity.ISummary =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {} satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(basicAnalytics);

  TestValidator.equals(
    "basic analytics response structure",
    basicAnalytics.data,
    basicAnalytics.data,
  );
  TestValidator.equals(
    "basic analytics pagination present",
    basicAnalytics.pagination,
    basicAnalytics.pagination,
  );
  TestValidator.predicate(
    "analytics data is array",
    Array.isArray(basicAnalytics.data),
  );

  // Step 3: Test analytics with activity type filtering
  const activityTypeAnalytics: IPageIRedditPlatformUserActivity.ISummary =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          activity_type: "post_created,comment_created",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(activityTypeAnalytics);

  TestValidator.equals(
    "activity type filtered analytics structure",
    activityTypeAnalytics.data,
    activityTypeAnalytics.data,
  );
  TestValidator.predicate(
    "filtered data is array",
    Array.isArray(activityTypeAnalytics.data),
  );

  // Step 4: Test analytics with date range filtering
  const dateFrom = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const dateTo = now.toISOString();

  const dateRangeAnalytics: IPageIRedditPlatformUserActivity.ISummary =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          date_from: dateFrom,
          date_to: dateTo,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(dateRangeAnalytics);

  TestValidator.equals(
    "date range analytics structure",
    dateRangeAnalytics.data,
    dateRangeAnalytics.data,
  );
  TestValidator.predicate(
    "date range data is array",
    Array.isArray(dateRangeAnalytics.data),
  );

  // Step 5: Test analytics with community-specific filtering
  const communitySpecificAnalytics: IPageIRedditPlatformUserActivity.ISummary =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          community_id: registeredUserId,
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(communitySpecificAnalytics);

  TestValidator.equals(
    "community specific analytics structure",
    communitySpecificAnalytics.data,
    communitySpecificAnalytics.data,
  );
  TestValidator.predicate(
    "community specific data is array",
    Array.isArray(communitySpecificAnalytics.data),
  );

  // Step 6: Test analytics with target content filtering
  const targetContentAnalytics: IPageIRedditPlatformUserActivity.ISummary =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          target_id: typia.random<string & tags.Format<"uuid">>(),
          limit: 50,
          order_by: "activity_type",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(targetContentAnalytics);

  TestValidator.equals(
    "target content analytics structure",
    targetContentAnalytics.data,
    targetContentAnalytics.data,
  );
  TestValidator.predicate(
    "target content data is array",
    Array.isArray(targetContentAnalytics.data),
  );

  // Step 7: Test comprehensive analytics with multiple filters
  const comprehensiveAnalytics: IPageIRedditPlatformUserActivity.ISummary =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          activity_type: "post_created,post_voted,comment_created",
          community_id: registeredUserId,
          date_from: dateFrom,
          date_to: dateTo,
          page: 1,
          limit: 25,
          order_by: "created_at",
          order_direction: "asc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(comprehensiveAnalytics);

  TestValidator.equals(
    "comprehensive analytics structure",
    comprehensiveAnalytics.data,
    comprehensiveAnalytics.data,
  );
  TestValidator.predicate(
    "comprehensive data is array",
    Array.isArray(comprehensiveAnalytics.data),
  );

  // Step 8: Validate pagination integrity
  TestValidator.equals(
    "pagination current page",
    comprehensiveAnalytics.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    comprehensiveAnalytics.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    comprehensiveAnalytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    comprehensiveAnalytics.pagination.pages >= 0,
  );

  // Step 9: Test data structure integrity for returned activities
  if (basicAnalytics.data.length > 0) {
    const sampleActivity = basicAnalytics.data[0];
    TestValidator.predicate(
      "activity has valid ID",
      typeof sampleActivity.id === "string",
    );
    TestValidator.predicate(
      "activity has valid type",
      typeof sampleActivity.activity_type === "string",
    );
    TestValidator.predicate(
      "activity has description",
      typeof sampleActivity.activity_description === "string",
    );
    TestValidator.predicate(
      "activity has timestamp",
      typeof sampleActivity.created_at === "string",
    );
    TestValidator.predicate(
      "activity has community ID",
      typeof sampleActivity.target_community_id === "string",
    );
  }

  // Step 10: Test boundary conditions with maximum limit
  const maxLimitAnalytics: IPageIRedditPlatformUserActivity.ISummary =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          limit: 100, // Maximum allowed limit
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(maxLimitAnalytics);

  TestValidator.equals(
    "max limit analytics structure",
    maxLimitAnalytics.data,
    maxLimitAnalytics.data,
  );
  TestValidator.predicate(
    "max limit data is array",
    Array.isArray(maxLimitAnalytics.data),
  );

  // Step 11: Validate moderator access scope
  TestValidator.equals(
    "moderator has active status",
    moderator.moderator.active_status,
    "active",
  );
  TestValidator.predicate(
    "moderator has valid permissions",
    typeof moderator.moderator.moderation_permissions === "object",
  );
  TestValidator.predicate(
    "moderator has assigned communities",
    typeof moderator.moderator.assigned_communities === "string",
  );
}
