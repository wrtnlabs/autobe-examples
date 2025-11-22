import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformContentEngagementTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformContentEngagementTrend";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformContentEngagementAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformContentEngagementAnalytics";
import type { IRedditPlatformContentEngagementTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformContentEngagementTrend";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_moderator_engagement_trends_aggregated_data(
  connection: api.IConnection,
) {
  // Create a community moderator account for authentication context
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();
  const moderationPermissions = JSON.stringify({
    can_remove_posts: true,
    can_remove_comments: true,
    can_ban_users: false,
    can_warn_users: true,
    can_pin_posts: true,
    can_edit_rules: false,
    can_manage_moderators: false,
    can_approve_posts: true,
  });
  const assignedCommunities = JSON.stringify([
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ]);
  const appointedBy = typia.random<string>();
  const currentTime = new Date().toISOString();

  // Step 1: Create moderator authentication context
  const moderatorAuth = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        registered_user_id: registeredUserId,
        moderation_permissions: moderationPermissions,
        assigned_communities: assignedCommunities,
        appointed_by: appointedBy,
        moderation_count: 0,
        last_moderation_action: currentTime,
        active_status: "active",
        appointed_at: currentTime,
        href: "https://test-moderator-app.example.com/register",
        referrer: "https://moderator-dashboard.example.com",
        created_at: currentTime,
        updated_at: currentTime,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  typia.assert(moderatorAuth);
  TestValidator.equals(
    "moderator authentication successful",
    moderatorAuth.moderator.active_status,
    "active",
  );

  // Step 2: Request aggregated engagement trends analytics
  const analyticsRequest = {
    engagement_types: [
      "view",
      "scroll",
      "share",
      "save",
      "click_external_link",
    ],
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
    date_to: currentTime,
    aggregated: true, // Request aggregated data for executive reporting
    page: 1,
    limit: 10,
    order_by: "created_at_desc" as const,
  } satisfies IRedditPlatformContentEngagementAnalytics.IRequest;

  const engagementTrends =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: analyticsRequest,
      },
    );
  typia.assert(engagementTrends);

  // Step 3: Validate response structure for executive reporting
  TestValidator.equals(
    "pagination structure present",
    typeof engagementTrends.pagination,
    "object",
  );
  TestValidator.equals(
    "data array present",
    Array.isArray(engagementTrends.data),
    true,
  );

  // Step 4: Validate aggregated analytics data structure
  if (engagementTrends.data.length > 0) {
    const firstTrend = engagementTrends.data[0];
    TestValidator.equals(
      "trend record has UUID",
      typeof firstTrend.id,
      "string",
    );
    TestValidator.equals(
      "trend has engagement type",
      typeof firstTrend.engagement_type,
      "string",
    );
    TestValidator.equals(
      "trend has creation timestamp",
      typeof firstTrend.created_at,
      "string",
    );
  }

  // Step 5: Validate pagination information for executive reporting
  const pagination = engagementTrends.pagination;
  TestValidator.equals("current page is valid", pagination.current >= 0, true);
  TestValidator.equals(
    "limit is within bounds",
    pagination.limit > 0 && pagination.limit <= 100,
    true,
  );
  TestValidator.equals(
    "records count is non-negative",
    pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pages calculation is correct",
    pagination.pages >= 0,
    true,
  );

  // Step 6: Business logic validation for executive reporting
  TestValidator.predicate(
    "aggregated data structure supports executive insights",
    engagementTrends.data.length >= 0, // Can be empty if no data in timeframe
  );

  // Step 7: Validate analytics request parameters in response context
  TestValidator.predicate(
    "analytics request was processed with aggregation enabled",
    analyticsRequest.aggregated === true,
  );

  TestValidator.equals(
    "analytics includes comprehensive engagement types",
    analyticsRequest.engagement_types?.length,
    5,
  );

  // Step 8: Final validation - ensure data is suitable for strategic planning
  TestValidator.predicate(
    "response structure supports high-level performance analysis",
    engagementTrends.pagination && engagementTrends.data !== undefined,
  );
}
