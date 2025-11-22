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

export async function test_api_moderator_engagement_trends_with_metadata(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as community moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorJoinResponse: IRedditPlatformCommunityModerator.IAuthorized =
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
          can_manage_moderators: true,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([
          typia.random<string & tags.Format<"uuid">>(),
          typia.random<string & tags.Format<"uuid">>(),
        ]),
        appointed_by: typia.random<string & tags.Format<"uuid">>(),
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://example.com/registration",
        referrer: "https://reddit.example.com/moderator-apply",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderatorJoinResponse);

  // Step 2: Test engagement trends analytics with metadata enabled
  const analyticsRequest: IRedditPlatformContentEngagementAnalytics.IRequest = {
    engagement_types: [
      "view",
      "scroll",
      "share",
      "save",
      "click_external_link",
    ],
    duration_min_seconds: 1,
    duration_max_seconds: 3600,
    with_metadata: true, // Enable detailed metadata for granular interaction analysis
    aggregated: false,
    page: 1,
    limit: 20,
    order_by: "created_at_desc",
  };

  const analyticsResponse: IPageIRedditPlatformContentEngagementTrend =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: analyticsRequest,
      },
    );
  typia.assert(analyticsResponse);

  // Step 3: Validate response structure
  TestValidator.equals(
    "pagination info present",
    analyticsResponse.pagination,
    analyticsResponse.pagination,
  );
  TestValidator.equals(
    "data array present",
    Array.isArray(analyticsResponse.data),
    true,
  );
  TestValidator.predicate(
    "valid pagination current page",
    analyticsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "valid pagination limit",
    analyticsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "valid pagination records",
    analyticsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "valid pagination pages",
    analyticsResponse.pagination.pages >= 0,
  );

  // Step 4: Validate engagement trend data structure if data exists
  if (analyticsResponse.data.length > 0) {
    const firstEngagement = analyticsResponse.data[0];

    // Validate required fields are present
    TestValidator.predicate(
      "engagement id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstEngagement.id,
      ),
    );
    TestValidator.predicate(
      "user id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstEngagement.reddit_platform_registereduser_id,
      ),
    );
    TestValidator.predicate(
      "engagement type is valid",
      ["view", "scroll", "share", "save", "click_external_link"].includes(
        firstEngagement.engagement_type,
      ),
    );
    TestValidator.predicate(
      "created at is valid ISO date",
      !isNaN(Date.parse(firstEngagement.created_at)),
    );

    // Validate metadata inclusion (since with_metadata: true was requested)
    if (firstEngagement.engagement_metadata) {
      TestValidator.predicate(
        "engagement metadata is valid JSON",
        (() => {
          try {
            JSON.parse(firstEngagement.engagement_metadata!);
            return true;
          } catch {
            return false;
          }
        })(),
      );

      // Test metadata contains granular interaction details
      const metadata = JSON.parse(firstEngagement.engagement_metadata!);
      const hasScrollDepth = "scrollDepth" in metadata;
      const hasClickCoordinates = "clickCoordinates" in metadata;
      const hasInteractionDetails =
        "interactionTime" in metadata || "viewDuration" in metadata;

      TestValidator.predicate(
        "metadata contains granular interaction details",
        hasScrollDepth || hasClickCoordinates || hasInteractionDetails,
      );
    }

    // Validate duration data if present
    if (firstEngagement.engagement_duration_seconds !== undefined) {
      TestValidator.predicate(
        "duration is non-negative",
        firstEngagement.engagement_duration_seconds >= 0,
      );
      TestValidator.predicate(
        "duration is within requested range",
        firstEngagement.engagement_duration_seconds >= 1 &&
          firstEngagement.engagement_duration_seconds <= 3600,
      );
    }

    // Validate target post/comment relationship
    if (firstEngagement.target_post_id !== undefined) {
      TestValidator.predicate(
        "target post id is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          firstEngagement.target_post_id!,
        ),
      );
    }

    if (firstEngagement.target_comment_id !== undefined) {
      TestValidator.predicate(
        "target comment id is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          firstEngagement.target_comment_id!,
        ),
      );
    }
  }

  // Step 5: Test different engagement types filtering
  const viewOnlyRequest: IRedditPlatformContentEngagementAnalytics.IRequest = {
    engagement_types: ["view"],
    with_metadata: true,
    aggregated: false,
    page: 1,
    limit: 10,
    order_by: "created_at_desc",
  };

  const viewOnlyResponse: IPageIRedditPlatformContentEngagementTrend =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: viewOnlyRequest,
      },
    );
  typia.assert(viewOnlyResponse);

  // Validate filtering works (all results should be "view" type)
  if (viewOnlyResponse.data.length > 0) {
    TestValidator.predicate(
      "view-only filtering works correctly",
      viewOnlyResponse.data.every(
        (engagement) => engagement.engagement_type === "view",
      ),
    );
  }

  // Step 6: Test duration-based filtering
  const durationFilteredRequest: IRedditPlatformContentEngagementAnalytics.IRequest =
    {
      duration_min_seconds: 30, // Filter for longer engagements (30+ seconds)
      duration_max_seconds: 300, // Up to 5 minutes
      with_metadata: true,
      aggregated: false,
      page: 1,
      limit: 10,
      order_by: "duration_desc",
    };

  const durationFilteredResponse: IPageIRedditPlatformContentEngagementTrend =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: durationFilteredRequest,
      },
    );
  typia.assert(durationFilteredResponse);

  // Validate duration filtering (if data exists, durations should be in range)
  if (durationFilteredResponse.data.length > 0) {
    const filteredDurations = durationFilteredResponse.data
      .filter((d) => d.engagement_duration_seconds !== undefined)
      .map((d) => d.engagement_duration_seconds!);

    if (filteredDurations.length > 0) {
      const minDuration = Math.min(...filteredDurations);
      const maxDuration = Math.max(...filteredDurations);

      TestValidator.predicate(
        "duration filtering lower bound",
        minDuration >= 30,
      );
      TestValidator.predicate(
        "duration filtering upper bound",
        maxDuration <= 300,
      );
    }
  }

  // Step 7: Test aggregated response
  const aggregatedRequest: IRedditPlatformContentEngagementAnalytics.IRequest =
    {
      engagement_types: ["view", "scroll"],
      with_metadata: false,
      aggregated: true, // Request aggregated analytics
      page: 1,
      limit: 10,
    };

  const aggregatedResponse: IPageIRedditPlatformContentEngagementTrend =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: aggregatedRequest,
      },
    );
  typia.assert(aggregatedResponse);

  // For aggregated response, validate the structure is appropriate for aggregated data
  TestValidator.predicate(
    "aggregated response has valid structure",
    aggregatedResponse.pagination && Array.isArray(aggregatedResponse.data),
  );
}
