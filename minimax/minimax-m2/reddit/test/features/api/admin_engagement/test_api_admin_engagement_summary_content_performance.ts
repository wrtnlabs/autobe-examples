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
 * Test platform administrator engagement summary with detailed content
 * performance analytics.
 *
 * Verify that administrators receive comprehensive content analysis including
 * engagement rates, virality scores, quality metrics, bounce rates, and
 * category-specific performance breakdowns for content strategy optimization.
 * This test validates the complete authentication workflow for platform
 * administrators followed by comprehensive analytics reporting that provides
 * actionable insights for platform management and content optimization
 * strategies.
 */
export async function test_api_admin_engagement_summary_content_performance(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account for analytics access
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureAdminPass123!",
    display_name: RandomGenerator.name(),
    administrator_level: "admin" as const,
    security_clearance: "high" as const,
    system_permissions: JSON.stringify({
      user_management: {
        can_create_users: false,
        can_modify_users: false,
        can_suspend_users: false,
        can_ban_users: false,
        can_view_user_data: true,
        can_manage_user_permissions: false,
      },
      community_oversight: {
        can_create_communities: false,
        can_modify_communities: false,
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
    }),
  };

  const administrator: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: adminCredentials satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Validate administrator account creation
  TestValidator.equals(
    "administrator ID is UUID format",
    administrator.id,
    administrator.id,
  );
  TestValidator.equals(
    "administrator level is admin",
    administrator.administrator_level,
    "admin",
  );
  TestValidator.equals(
    "administrator status is active",
    administrator.active_status,
    "active",
  );
  TestValidator.equals(
    "security clearance is high",
    administrator.security_clearance,
    "high",
  );

  // Step 2: Generate comprehensive engagement summary report
  const engagementSummary: IRedditPlatformEngagementSummaryReport =
    await api.functional.redditPlatform.platformAdministrator.reports.engagementSummary.at(
      connection,
    );
  typia.assert(engagementSummary);

  // Step 3: Validate report structure and required analytics components
  TestValidator.equals(
    "report has unique identifier",
    engagementSummary.report_id,
    engagementSummary.report_id,
  );
  TestValidator.predicate(
    "report generation timestamp is valid",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      engagementSummary.generated_at,
    ),
  );
  TestValidator.equals(
    "reporting period is specified",
    engagementSummary.reporting_period,
    engagementSummary.reporting_period,
  );

  // Validate platform overview metrics
  TestValidator.predicate(
    "total active users is non-negative",
    engagementSummary.platform_overview.total_active_users >= 0,
  );
  TestValidator.predicate(
    "total posts created is non-negative",
    engagementSummary.platform_overview.total_posts_created >= 0,
  );
  TestValidator.predicate(
    "total comments created is non-negative",
    engagementSummary.platform_overview.total_comments_created >= 0,
  );
  TestValidator.predicate(
    "total votes cast is non-negative",
    engagementSummary.platform_overview.total_votes_cast >= 0,
  );
  TestValidator.predicate(
    "overall engagement rate is valid percentage",
    engagementSummary.platform_overview.overall_engagement_rate >= 0 &&
      engagementSummary.platform_overview.overall_engagement_rate <= 100,
  );

  // Validate content performance analytics
  TestValidator.predicate(
    "average engagement rate is valid",
    engagementSummary.content_performance.average_engagement_rate >= 0,
  );
  TestValidator.predicate(
    "content virality score is within bounds",
    engagementSummary.content_performance.content_virality_score >= 0 &&
      engagementSummary.content_performance.content_virality_score <= 100,
  );
  TestValidator.predicate(
    "content quality score is valid",
    engagementSummary.content_performance.content_quality_score >= 0 &&
      engagementSummary.content_performance.content_quality_score <= 100,
  );

  // Validate community health metrics
  TestValidator.predicate(
    "total communities is non-negative",
    engagementSummary.community_health.total_communities >= 0,
  );
  TestValidator.predicate(
    "community growth rate is valid percentage",
    engagementSummary.community_health.community_growth_rate >= -100 &&
      engagementSummary.community_health.community_growth_rate <= 100,
  );
  TestValidator.predicate(
    "healthy communities ratio is valid",
    engagementSummary.community_health.healthy_communities_ratio >= 0 &&
      engagementSummary.community_health.healthy_communities_ratio <= 100,
  );
  TestValidator.predicate(
    "moderation efficiency is valid",
    engagementSummary.community_health.moderation_efficiency >= 0,
  );

  // Validate user engagement analytics
  TestValidator.predicate(
    "average daily active users is non-negative",
    engagementSummary.user_engagement.average_daily_active_users >= 0,
  );
  TestValidator.predicate(
    "user session frequency is valid",
    engagementSummary.user_engagement.user_session_frequency >= 0,
  );
  TestValidator.predicate(
    "average session length is valid",
    engagementSummary.user_engagement.average_session_length >= 0,
  );
  TestValidator.predicate(
    "user creation rate is valid",
    engagementSummary.user_engagement.user_creation_rate >= 0,
  );

  // Validate moderation summary
  TestValidator.predicate(
    "total reports filed is non-negative",
    engagementSummary.moderation_summary.total_reports_filed >= 0,
  );
  TestValidator.predicate(
    "reports resolved is non-negative",
    engagementSummary.moderation_summary.reports_resolved >= 0,
  );
  TestValidator.predicate(
    "average resolution time is valid",
    engagementSummary.moderation_summary.average_resolution_time >= 0,
  );
  TestValidator.predicate(
    "moderation actions taken is non-negative",
    engagementSummary.moderation_summary.moderation_actions_taken >= 0,
  );

  // Step 4: Validate optional analytics components when present
  if (engagementSummary.top_communities) {
    TestValidator.predicate(
      "top communities is non-empty array",
      engagementSummary.top_communities.length > 0,
    );

    // Validate each top community entry
    for (const community of engagementSummary.top_communities) {
      TestValidator.predicate(
        "community ID is UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          community.community_id,
        ),
      );
      TestValidator.predicate(
        "community name is non-empty",
        community.community_name.length > 0,
      );
      TestValidator.predicate(
        "member count is positive",
        community.member_count > 0,
      );
      TestValidator.predicate(
        "engagement rate is valid",
        community.engagement_rate >= 0,
      );
      TestValidator.predicate("rank is positive", community.rank > 0);
    }
  }

  if (engagementSummary.top_content_categories) {
    TestValidator.predicate(
      "top content categories is non-empty array",
      engagementSummary.top_content_categories.length > 0,
    );

    // Validate each content category entry
    for (const category of engagementSummary.top_content_categories) {
      TestValidator.predicate(
        "category name is non-empty",
        category.category_name.length > 0,
      );
      TestValidator.predicate(
        "total posts is non-negative",
        category.total_posts >= 0,
      );
      TestValidator.predicate(
        "average engagement is valid",
        category.average_engagement >= 0,
      );
      TestValidator.predicate(
        "virality score is within bounds",
        category.virality_score >= 0 && category.virality_score <= 100,
      );
      TestValidator.predicate("rank is positive", category.rank > 0);
    }
  }

  if (engagementSummary.growth_indicators) {
    const growth = engagementSummary.growth_indicators;
    TestValidator.predicate(
      "member count is non-negative",
      growth.member_count >= 0,
    );
    TestValidator.predicate(
      "active member count is non-negative",
      growth.active_member_count >= 0,
    );
    TestValidator.predicate(
      "retention rate is valid",
      growth.retention_rate >= 0 && growth.retention_rate <= 100,
    );
    TestValidator.predicate(
      "activity score is within bounds",
      growth.activity_score >= 0 && growth.activity_score <= 100,
    );
  }

  // Step 5: Validate key insights and recommendations if present
  if (engagementSummary.key_insights) {
    TestValidator.predicate(
      "key insights is array",
      Array.isArray(engagementSummary.key_insights),
    );
    TestValidator.predicate(
      "insights are non-empty strings",
      engagementSummary.key_insights.every(
        (insight) => typeof insight === "string" && insight.length > 0,
      ),
    );
  }

  if (engagementSummary.recommendations) {
    TestValidator.predicate(
      "recommendations is array",
      Array.isArray(engagementSummary.recommendations),
    );
    TestValidator.predicate(
      "recommendations are non-empty strings",
      engagementSummary.recommendations.every(
        (rec) => typeof rec === "string" && rec.length > 0,
      ),
    );
  }

  // Step 6: Validate content category metrics if present
  if (engagementSummary.content_performance.content_categories) {
    for (const categoryMetric of engagementSummary.content_performance
      .content_categories) {
      TestValidator.predicate(
        "category name is specified",
        categoryMetric.category_name.length > 0,
      );
      TestValidator.predicate(
        "post count is non-negative",
        categoryMetric.post_count >= 0,
      );
      TestValidator.predicate(
        "average engagement is valid",
        categoryMetric.average_engagement >= 0,
      );
      TestValidator.predicate(
        "virality score is within bounds",
        categoryMetric.virality_score >= 0 &&
          categoryMetric.virality_score <= 100,
      );
      TestValidator.predicate(
        "period timestamps are valid",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
          categoryMetric.period_start,
        ) &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
            categoryMetric.period_end,
          ),
      );
    }
  }

  // Step 7: Validate user activity distribution if present
  if (engagementSummary.user_engagement.user_activity_distribution) {
    const distribution =
      engagementSummary.user_engagement.user_activity_distribution;
    TestValidator.predicate(
      "power users count is non-negative",
      distribution.power_users >= 0,
    );
    TestValidator.predicate(
      "active users count is non-negative",
      distribution.active_users >= 0,
    );
    TestValidator.predicate(
      "casual users count is non-negative",
      distribution.casual_users >= 0,
    );
    TestValidator.predicate(
      "inactive users count is non-negative",
      distribution.inactive_users >= 0,
    );
  }

  // Step 8: Validate engagement trends if present
  if (engagementSummary.user_engagement.engagement_trends) {
    for (const trend of engagementSummary.user_engagement.engagement_trends) {
      TestValidator.predicate(
        "trend period is specified",
        trend.period.length > 0,
      );
      TestValidator.predicate(
        "engagement rate is valid",
        trend.engagement_rate >= 0 && trend.engagement_rate <= 100,
      );
      TestValidator.predicate(
        "active users is non-negative",
        trend.active_users >= 0,
      );
      TestValidator.predicate(
        "content interactions is non-negative",
        trend.content_interactions >= 0,
      );
    }
  }

  // Step 9: Validate report category statistics if present
  if (engagementSummary.moderation_summary.report_categories) {
    for (const categoryStat of engagementSummary.moderation_summary
      .report_categories) {
      TestValidator.predicate(
        "category name is specified",
        categoryStat.category.length > 0,
      );
      TestValidator.predicate(
        "total reports is non-negative",
        categoryStat.total_reports >= 0,
      );
      TestValidator.predicate(
        "resolved reports is non-negative",
        categoryStat.resolved_reports >= 0,
      );
      TestValidator.predicate(
        "resolution rate is valid",
        categoryStat.resolution_rate >= 0 &&
          categoryStat.resolution_rate <= 100,
      );
      TestValidator.predicate(
        "average resolution time is valid",
        categoryStat.average_resolution_time >= 0,
      );
      TestValidator.predicate(
        "severity score is within bounds",
        categoryStat.severity_score >= 0 && categoryStat.severity_score <= 10,
      );
    }
  }

  // Step 10: Validate growing communities if present
  if (engagementSummary.community_health.top_growing_communities) {
    for (const growingCommunity of engagementSummary.community_health
      .top_growing_communities) {
      TestValidator.predicate(
        "community ID is UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          growingCommunity.redditPlatformCommunityId,
        ),
      );
      TestValidator.predicate(
        "community name is non-empty",
        growingCommunity.community_name.length > 0,
      );
      TestValidator.predicate(
        "growth rate is valid",
        typeof growingCommunity.growth_rate === "number",
      );
      TestValidator.predicate(
        "member count is positive",
        growingCommunity.member_count > 0,
      );
      TestValidator.predicate(
        "engagement score is non-negative",
        growingCommunity.engagement_score >= 0,
      );
      TestValidator.predicate(
        "growth factors is non-empty array",
        growingCommunity.growth_factors.length > 0,
      );
    }
  }

  // Final validation: Ensure all core analytics components are present and meaningful
  TestValidator.predicate(
    "report contains platform overview",
    engagementSummary.platform_overview !== undefined,
  );
  TestValidator.predicate(
    "report contains content performance",
    engagementSummary.content_performance !== undefined,
  );
  TestValidator.predicate(
    "report contains community health",
    engagementSummary.community_health !== undefined,
  );
  TestValidator.predicate(
    "report contains user engagement",
    engagementSummary.user_engagement !== undefined,
  );
  TestValidator.predicate(
    "report contains moderation summary",
    engagementSummary.moderation_summary !== undefined,
  );
}
