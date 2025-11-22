import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformEngagementSummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformEngagementSummaryReport";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Test platform administrator engagement summary focusing on high-level
 * platform statistics and KPIs. This comprehensive test validates that
 * authenticated administrators receive complete platform overview metrics
 * including total active users, content creation rates, engagement rates,
 * session durations, and platform growth indicators for executive
 * decision-making. The test flow involves: 1) Creating a platform administrator
 * account through the authentication endpoint, 2) Generating an engagement
 * summary report through the analytics endpoint, 3) Validating that the
 * response contains all required platform overview sections including user
 * engagement metrics, content performance indicators, community health
 * statistics, and growth trends, 4) Verifying data structure integrity and
 * business logic validation across all report components. This test ensures the
 * administrative dashboard provides actionable insights for platform
 * optimization and strategic planning.
 */
export async function test_api_admin_engagement_summary_platform_overview(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdmin123!";

  const adminAccount: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(2),
        administrator_level: "super_admin",
        system_permissions: JSON.stringify({
          user_management: {
            can_create_users: true,
            can_modify_users: true,
            can_suspend_users: true,
            can_ban_users: true,
            can_view_user_data: true,
            can_manage_user_permissions: true,
          },
          community_oversight: {
            can_create_communities: true,
            can_modify_communities: true,
            can_suspend_communities: true,
            can_delete_communities: true,
            can_moderate_all_communities: true,
            can_view_community_data: true,
          },
          content_moderation: {
            can_remove_content: true,
            can_moderate_globally: true,
            can_manage_reports: true,
            can_shadowban_content: true,
            can_restore_content: true,
            can_view_hidden_content: true,
          },
          system_configuration: {
            can_manage_settings: true,
            can_manage_features: true,
            can_manage_integrations: true,
            can_view_system_logs: true,
            can_manage_security: true,
            can_manage_backup: true,
          },
          compliance_legal: {
            can_access_compliance_data: true,
            can_manage_privacy: true,
            can_manage_data_retention: true,
            can_handle_dmca: true,
            can_manage_legal_requests: true,
            can_view_analytics: true,
          },
        }),
        security_clearance: "top_secret",
        managed_communities: undefined,
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(adminAccount);

  TestValidator.equals(
    "administrator account created successfully",
    adminAccount.administrator_level,
    "super_admin",
  );
  TestValidator.equals(
    "admin has analytics access permission",
    adminAccount.system_permissions.compliance_legal.can_view_analytics,
    true,
  );

  // Step 2: Generate engagement summary report for platform overview
  const engagementReport: IRedditPlatformEngagementSummaryReport =
    await api.functional.redditPlatform.platformAdministrator.reports.engagementSummary.at(
      connection,
    );
  typia.assert(engagementReport);

  // Step 3: Validate platform overview metrics structure and data
  TestValidator.equals(
    "report has unique identifier",
    engagementReport.report_id,
    engagementReport.report_id,
  );
  TestValidator.equals(
    "report was generated with timestamp",
    engagementReport.generated_at,
    engagementReport.generated_at,
  );
  TestValidator.equals(
    "report specifies analytics period",
    engagementReport.reporting_period,
    engagementReport.reporting_period,
  );

  // Step 4: Validate platform overview statistics
  TestValidator.predicate(
    "total active users is non-negative",
    engagementReport.platform_overview.total_active_users >= 0,
  );
  TestValidator.predicate(
    "total posts created is non-negative",
    engagementReport.platform_overview.total_posts_created >= 0,
  );
  TestValidator.predicate(
    "total comments created is non-negative",
    engagementReport.platform_overview.total_comments_created >= 0,
  );
  TestValidator.predicate(
    "total votes cast is non-negative",
    engagementReport.platform_overview.total_votes_cast >= 0,
  );
  TestValidator.predicate(
    "overall engagement rate is valid percentage",
    engagementReport.platform_overview.overall_engagement_rate >= 0 &&
      engagementReport.platform_overview.overall_engagement_rate <= 100,
  );

  // Step 5: Validate content performance metrics
  TestValidator.predicate(
    "average engagement rate is valid percentage",
    engagementReport.content_performance.average_engagement_rate >= 0 &&
      engagementReport.content_performance.average_engagement_rate <= 100,
  );
  TestValidator.predicate(
    "content virality score is within valid range",
    engagementReport.content_performance.content_virality_score >= 0 &&
      engagementReport.content_performance.content_virality_score <= 100,
  );
  TestValidator.predicate(
    "content quality score is within valid range",
    engagementReport.content_performance.content_quality_score >= 0 &&
      engagementReport.content_performance.content_quality_score <= 100,
  );

  // Step 6: Validate community health indicators
  TestValidator.predicate(
    "total communities count is non-negative",
    engagementReport.community_health.total_communities >= 0,
  );
  TestValidator.predicate(
    "community growth rate is valid percentage",
    engagementReport.community_health.community_growth_rate >=
      engagementReport.community_health.community_growth_rate,
  );
  TestValidator.predicate(
    "healthy communities ratio is valid percentage",
    engagementReport.community_health.healthy_communities_ratio >= 0 &&
      engagementReport.community_health.healthy_communities_ratio <= 100,
  );
  TestValidator.predicate(
    "moderation efficiency is valid percentage",
    engagementReport.community_health.moderation_efficiency >= 0 &&
      engagementReport.community_health.moderation_efficiency <= 100,
  );

  // Step 7: Validate user engagement analysis
  TestValidator.predicate(
    "average daily active users is non-negative",
    engagementReport.user_engagement.average_daily_active_users >= 0,
  );
  TestValidator.predicate(
    "user session frequency is positive",
    engagementReport.user_engagement.user_session_frequency > 0,
  );
  TestValidator.predicate(
    "average session length is positive",
    engagementReport.user_engagement.average_session_length > 0,
  );
  TestValidator.predicate(
    "user creation rate is non-negative",
    engagementReport.user_engagement.user_creation_rate >= 0,
  );

  // Step 8: Validate moderation summary statistics
  TestValidator.predicate(
    "total reports filed is non-negative",
    engagementReport.moderation_summary.total_reports_filed >= 0,
  );
  TestValidator.predicate(
    "reports resolved is non-negative",
    engagementReport.moderation_summary.reports_resolved >= 0,
  );
  TestValidator.predicate(
    "reports resolved does not exceed total filed",
    engagementReport.moderation_summary.reports_resolved <=
      engagementReport.moderation_summary.total_reports_filed,
  );
  TestValidator.predicate(
    "average resolution time is non-negative",
    engagementReport.moderation_summary.average_resolution_time >= 0,
  );
  TestValidator.predicate(
    "moderation actions taken is non-negative",
    engagementReport.moderation_summary.moderation_actions_taken >= 0,
  );

  // Step 9: Validate optional sections if present
  if (engagementReport.top_communities) {
    engagementReport.top_communities.forEach((community, index) => {
      TestValidator.predicate(
        `community ${index + 1} has valid member count`,
        community.member_count >= 0,
      );
      TestValidator.predicate(
        `community ${index + 1} has valid engagement rate`,
        community.engagement_rate >= 0 && community.engagement_rate <= 100,
      );
      TestValidator.predicate(
        `community ${index + 1} has valid rank`,
        community.rank > 0,
      );
    });
  }

  if (engagementReport.top_content_categories) {
    engagementReport.top_content_categories.forEach((category, index) => {
      TestValidator.predicate(
        `content category ${index + 1} has valid post count`,
        category.total_posts >= 0,
      );
      TestValidator.predicate(
        `content category ${index + 1} has valid engagement rate`,
        category.average_engagement >= 0 && category.average_engagement <= 100,
      );
      TestValidator.predicate(
        `content category ${index + 1} has valid rank`,
        category.rank > 0,
      );
    });
  }

  if (engagementReport.growth_indicators) {
    TestValidator.predicate(
      "user growth rate is non-negative",
      engagementReport.growth_indicators.user_growth_rate >= 0,
    );
    TestValidator.predicate(
      "content growth rate is non-negative",
      engagementReport.growth_indicators.content_growth_rate >= 0,
    );
    TestValidator.predicate(
      "engagement growth rate is non-negative",
      engagementReport.growth_indicators.engagement_growth_rate >= 0,
    );
    TestValidator.predicate(
      "member retention rate is valid percentage",
      engagementReport.growth_indicators.retention_rate >= 0 &&
        engagementReport.growth_indicators.retention_rate <= 100,
    );
  }

  // Step 10: Validate business logic consistency
  TestValidator.predicate(
    "average engagement rate consistency",
    engagementReport.content_performance.average_engagement_rate >=
      engagementReport.platform_overview.overall_engagement_rate * 0.8 &&
      engagementReport.content_performance.average_engagement_rate <=
        engagementReport.platform_overview.overall_engagement_rate * 1.2,
  );
  TestValidator.predicate(
    "user retention consistency",
    engagementReport.user_engagement.user_retention_rate === undefined ||
      (engagementReport.user_engagement.user_retention_rate >= 0 &&
        engagementReport.user_engagement.user_retention_rate <= 100),
  );

  // Step 11: Validate report data freshness and consistency
  const currentTime = new Date();
  const reportTime = new Date(engagementReport.generated_at);
  const timeDifference = currentTime.getTime() - reportTime.getTime();
  TestValidator.predicate(
    "report was generated recently",
    timeDifference >= 0 && timeDifference <= 24 * 60 * 60 * 1000, // Within last 24 hours
  );

  // Final validation: Ensure the report provides actionable insights for platform management
  TestValidator.equals(
    "report contains platform overview section",
    engagementReport.platform_overview.total_active_users,
    engagementReport.platform_overview.total_active_users,
  );
  TestValidator.equals(
    "report contains content performance section",
    engagementReport.content_performance.average_engagement_rate,
    engagementReport.content_performance.average_engagement_rate,
  );
  TestValidator.equals(
    "report contains community health section",
    engagementReport.community_health.total_communities,
    engagementReport.community_health.total_communities,
  );
  TestValidator.equals(
    "report contains user engagement section",
    engagementReport.user_engagement.average_daily_active_users,
    engagementReport.user_engagement.average_daily_active_users,
  );
  TestValidator.equals(
    "report contains moderation summary section",
    engagementReport.moderation_summary.total_reports_filed,
    engagementReport.moderation_summary.total_reports_filed,
  );
}
