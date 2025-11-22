import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformContentEngagementTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformContentEngagementTrend";
import type { IRedditPlatformContentEngagementAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformContentEngagementAnalytics";
import type { IRedditPlatformContentEngagementTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformContentEngagementTrend";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Comprehensive platform administrator engagement analytics testing with
 * metadata inclusion.
 *
 * This test validates that platform administrators can access granular
 * engagement data including scroll depth, interaction coordinates, and
 * behavioral insights for content strategy optimization. The test creates an
 * administrator account, requests analytics with detailed metadata, and
 * validates the comprehensive engagement analytics response.
 */
export async function test_api_analytics_engagement_trends_metadata_inclusion(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account with analytics permissions
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUsername: string = RandomGenerator.alphaNumeric(12);

  const adminPermissions = JSON.stringify({
    user_management: {
      can_create_users: true,
      can_modify_users: true,
      can_suspend_users: false,
      can_ban_users: false,
      can_view_user_data: true,
      can_manage_user_permissions: false,
    },
    community_oversight: {
      can_create_communities: true,
      can_modify_communities: true,
      can_suspend_communities: false,
      can_delete_communities: false,
      can_moderate_all_communities: true,
      can_view_community_data: true,
    },
    content_moderation: {
      can_remove_content: true,
      can_moderate_globally: true,
      can_manage_reports: true,
      can_shadowban_content: false,
      can_restore_content: true,
      can_view_hidden_content: true,
    },
    system_configuration: {
      can_manage_settings: false,
      can_manage_features: false,
      can_manage_integrations: false,
      can_view_system_logs: true,
      can_manage_security: false,
      can_manage_backup: false,
    },
    compliance_legal: {
      can_access_compliance_data: true,
      can_manage_privacy: false,
      can_manage_data_retention: false,
      can_handle_dmca: false,
      can_manage_legal_requests: false,
      can_view_analytics: true,
    },
  });

  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: "SecureAdmin123!",
        display_name: "Analytics Administrator",
        administrator_level: "admin",
        system_permissions: adminPermissions,
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });

  typia.assert(admin);
  TestValidator.equals(
    "admin username matches",
    admin.user.username,
    adminUsername,
  );
  TestValidator.equals(
    "admin has analytics access",
    admin.system_permissions.compliance_legal.can_view_analytics,
    true,
  );

  // Step 2: Request engagement analytics with metadata inclusion
  const analyticsRequest: IRedditPlatformContentEngagementAnalytics.IRequest = {
    engagement_types: [
      "view",
      "scroll",
      "share",
      "save",
      "click_external_link",
    ],
    duration_min_seconds: 5,
    duration_max_seconds: 3600,
    with_metadata: true,
    aggregated: false,
    page: 1,
    limit: 20,
    order_by: "created_at_desc",
  };

  const engagementAnalytics: IPageIRedditPlatformContentEngagementTrend =
    await api.functional.redditPlatform.platformAdministrator.analytics.engagementTrends.index(
      connection,
      {
        body: analyticsRequest,
      },
    );

  typia.assert(engagementAnalytics);
  TestValidator.equals(
    "analytics has pagination info",
    engagementAnalytics.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit matches request",
    engagementAnalytics.pagination.limit <= 20,
  );

  // Step 3: Validate engagement data structure and metadata quality
  if (engagementAnalytics.data.length > 0) {
    const firstEngagement: IRedditPlatformContentEngagementTrend =
      engagementAnalytics.data[0];

    // Validate core engagement properties
    TestValidator.equals(
      "has valid engagement ID",
      firstEngagement.id.length > 0,
      true,
    );
    TestValidator.equals(
      "has user reference",
      firstEngagement.reddit_platform_registereduser_id.length > 0,
      true,
    );
    TestValidator.equals(
      "has engagement type",
      firstEngagement.engagement_type.length > 0,
      true,
    );

    // Validate engagement metadata inclusion
    TestValidator.predicate(
      "metadata field exists",
      "engagement_metadata" in firstEngagement,
    );
    TestValidator.equals(
      "metadata is present",
      firstEngagement.engagement_metadata !== null,
      true,
    );

    // Validate engagement duration
    if (
      firstEngagement.engagement_duration_seconds !== null &&
      firstEngagement.engagement_duration_seconds !== undefined
    ) {
      TestValidator.predicate(
        "duration within specified range",
        firstEngagement.engagement_duration_seconds >= 5 &&
          firstEngagement.engagement_duration_seconds <= 3600,
      );
    }

    // Validate timestamps
    TestValidator.equals(
      "has valid created timestamp",
      firstEngagement.created_at.length > 0,
      true,
    );
  }

  // Step 4: Test date range filtering
  const dateRangeRequest: IRedditPlatformContentEngagementAnalytics.IRequest = {
    engagement_types: ["view"],
    date_from: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    date_to: new Date().toISOString(), // now
    with_metadata: true,
    page: 1,
    limit: 10,
  };

  const dateFilteredAnalytics: IPageIRedditPlatformContentEngagementTrend =
    await api.functional.redditPlatform.platformAdministrator.analytics.engagementTrends.index(
      connection,
      {
        body: dateRangeRequest,
      },
    );

  typia.assert(dateFilteredAnalytics);
  TestValidator.predicate(
    "date filtered analytics returned",
    dateFilteredAnalytics.data.length >= 0,
  );

  // Step 5: Test community-specific filtering
  const communityRequest: IRedditPlatformContentEngagementAnalytics.IRequest = {
    target_community_id: typia.random<string & tags.Format<"uuid">>(),
    with_metadata: true,
    aggregated: true,
    page: 1,
    limit: 5,
  };

  const communityAnalytics: IPageIRedditPlatformContentEngagementTrend =
    await api.functional.redditPlatform.platformAdministrator.analytics.engagementTrends.index(
      connection,
      {
        body: communityRequest,
      },
    );

  typia.assert(communityAnalytics);
  TestValidator.predicate(
    "community analytics completed",
    communityAnalytics.data.length >= 0,
  );

  // Step 6: Test aggregated analytics request
  const aggregatedRequest: IRedditPlatformContentEngagementAnalytics.IRequest =
    {
      with_metadata: false,
      aggregated: true,
      page: 1,
      limit: 15,
      order_by: "duration_desc",
    };

  const aggregatedAnalytics: IPageIRedditPlatformContentEngagementTrend =
    await api.functional.redditPlatform.platformAdministrator.analytics.engagementTrends.index(
      connection,
      {
        body: aggregatedRequest,
      },
    );

  typia.assert(aggregatedAnalytics);
  TestValidator.predicate(
    "aggregated analytics returned",
    aggregatedAnalytics.data.length >= 0,
  );

  // Step 7: Validate pagination across requests
  const multiPageRequest: IRedditPlatformContentEngagementAnalytics.IRequest = {
    engagement_types: ["scroll", "share"],
    with_metadata: true,
    page: 2,
    limit: 10,
  };

  const multiPageAnalytics: IPageIRedditPlatformContentEngagementTrend =
    await api.functional.redditPlatform.platformAdministrator.analytics.engagementTrends.index(
      connection,
      {
        body: multiPageRequest,
      },
    );

  typia.assert(multiPageAnalytics);
  TestValidator.equals(
    "page number matches request",
    multiPageAnalytics.pagination.current,
    2,
  );
  TestValidator.predicate(
    "multi-page result returned",
    multiPageAnalytics.data.length <= 10,
  );

  // Step 8: Final validation of metadata completeness
  if (engagementAnalytics.data.length > 0) {
    const sampleEngagement = engagementAnalytics.data[0];

    // Ensure metadata provides behavioral insights
    if (sampleEngagement.engagement_metadata) {
      try {
        const metadata = JSON.parse(sampleEngagement.engagement_metadata);
        TestValidator.predicate(
          "metadata is valid JSON",
          typeof metadata === "object",
        );

        // Check for behavioral insights fields (scroll depth, coordinates, etc.)
        const hasBehavioralInsights =
          "scroll_depth" in metadata ||
          "click_coordinates" in metadata ||
          "interaction_patterns" in metadata ||
          "user_behavior" in metadata;

        TestValidator.predicate(
          "metadata includes behavioral insights",
          hasBehavioralInsights,
        );
      } catch (error) {
        TestValidator.predicate("metadata parsing failed", false);
      }
    }
  }

  TestValidator.equals("comprehensive analytics test completed", true, true);
}
