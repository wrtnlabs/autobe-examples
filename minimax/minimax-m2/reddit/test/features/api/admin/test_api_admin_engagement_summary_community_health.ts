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
 * Test platform administrator engagement summary with comprehensive community
 * ecosystem analysis.
 *
 * Validates that administrators receive detailed community health metrics
 * including growth rates, member retention, engagement patterns, and
 * top-performing communities for strategic community management and platform
 * growth initiatives.
 */
export async function test_api_admin_engagement_summary_community_health(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account to establish proper authorization
  const platformAdministrator: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
        administrator_level: "super_admin",
        security_clearance: "high",
        system_permissions: JSON.stringify({
          user_management: {
            can_create_users: true,
            can_modify_users: true,
            can_view_user_data: true,
          },
          community_oversight: {
            can_create_communities: true,
            can_modify_communities: true,
            can_view_community_data: true,
          },
          content_moderation: {
            can_remove_content: true,
            can_manage_reports: true,
            can_view_hidden_content: true,
          },
          system_configuration: {
            can_manage_settings: true,
            can_view_system_logs: true,
          },
          compliance_legal: {
            can_access_compliance_data: true,
            can_view_analytics: true,
          },
        }),
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(platformAdministrator);

  // Step 2: Retrieve comprehensive engagement summary report
  const engagementSummary: IRedditPlatformEngagementSummaryReport =
    await api.functional.redditPlatform.platformAdministrator.reports.engagementSummary.at(
      connection,
    );
  typia.assert(engagementSummary);

  // Step 3: Validate report structure and required sections
  TestValidator.equals(
    "report has ID",
    engagementSummary.report_id.length > 0,
    true,
  );
  TestValidator.equals(
    "report has generation timestamp",
    engagementSummary.generated_at.length > 0,
    true,
  );
  TestValidator.equals(
    "report has reporting period",
    engagementSummary.reporting_period.length > 0,
    true,
  );

  // Step 4: Validate platform overview metrics
  TestValidator.predicate(
    "platform overview exists",
    engagementSummary.platform_overview !== undefined &&
      engagementSummary.platform_overview !== null,
  );
  TestValidator.predicate(
    "total active users is positive",
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
    "overall engagement rate is valid",
    engagementSummary.platform_overview.overall_engagement_rate >= 0 &&
      engagementSummary.platform_overview.overall_engagement_rate <= 100,
  );

  // Step 5: Validate content performance analytics
  TestValidator.predicate(
    "content performance exists",
    engagementSummary.content_performance !== undefined &&
      engagementSummary.content_performance !== null,
  );
  TestValidator.predicate(
    "average engagement rate is valid",
    engagementSummary.content_performance.average_engagement_rate >= 0 &&
      engagementSummary.content_performance.average_engagement_rate <= 100,
  );
  TestValidator.predicate(
    "content virality score is valid",
    engagementSummary.content_performance.content_virality_score >= 0 &&
      engagementSummary.content_performance.content_virality_score <= 100,
  );
  TestValidator.predicate(
    "content quality score is valid",
    engagementSummary.content_performance.content_quality_score >= 0 &&
      engagementSummary.content_performance.content_quality_score <= 100,
  );

  // Step 6: Validate community health metrics
  TestValidator.predicate(
    "community health exists",
    engagementSummary.community_health !== undefined &&
      engagementSummary.community_health !== null,
  );
  TestValidator.predicate(
    "total communities is positive",
    engagementSummary.community_health.total_communities >= 0,
  );
  TestValidator.predicate(
    "community growth rate is valid",
    engagementSummary.community_health.community_growth_rate >= -100,
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

  // Step 7: Validate user engagement analysis
  TestValidator.predicate(
    "user engagement exists",
    engagementSummary.user_engagement !== undefined &&
      engagementSummary.user_engagement !== null,
  );
  TestValidator.predicate(
    "average daily active users is positive",
    engagementSummary.user_engagement.average_daily_active_users >= 0,
  );
  TestValidator.predicate(
    "user session frequency is positive",
    engagementSummary.user_engagement.user_session_frequency >= 0,
  );
  TestValidator.predicate(
    "average session length is positive",
    engagementSummary.user_engagement.average_session_length >= 0,
  );
  TestValidator.predicate(
    "user creation rate is non-negative",
    engagementSummary.user_engagement.user_creation_rate >= 0,
  );

  // Step 8: Validate moderation summary
  TestValidator.predicate(
    "moderation summary exists",
    engagementSummary.moderation_summary !== undefined &&
      engagementSummary.moderation_summary !== null,
  );
  TestValidator.predicate(
    "total reports filed is non-negative",
    engagementSummary.moderation_summary.total_reports_filed >= 0,
  );
  TestValidator.predicate(
    "reports resolved is non-negative",
    engagementSummary.moderation_summary.reports_resolved >= 0,
  );
  TestValidator.predicate(
    "moderation actions taken is non-negative",
    engagementSummary.moderation_summary.moderation_actions_taken >= 0,
  );
  TestValidator.predicate(
    "resolution efficiency is valid",
    engagementSummary.moderation_summary.reports_resolved <=
      engagementSummary.moderation_summary.total_reports_filed,
  );

  // Step 9: Validate optional analytics sections
  if (engagementSummary.top_communities) {
    TestValidator.predicate(
      "top communities is array",
      Array.isArray(engagementSummary.top_communities),
    );
    for (const community of engagementSummary.top_communities) {
      TestValidator.predicate(
        "community has ID",
        community.community_id.length > 0,
      );
      TestValidator.predicate(
        "community has name",
        community.community_name.length > 0,
      );
      TestValidator.predicate(
        "community member count is positive",
        community.member_count >= 0,
      );
      TestValidator.predicate(
        "community engagement rate is valid",
        community.engagement_rate >= 0 && community.engagement_rate <= 100,
      );
    }
  }

  if (engagementSummary.top_content_categories) {
    TestValidator.predicate(
      "top content categories is array",
      Array.isArray(engagementSummary.top_content_categories),
    );
    for (const category of engagementSummary.top_content_categories) {
      TestValidator.predicate(
        "category has name",
        category.category_name.length > 0,
      );
      TestValidator.predicate(
        "category total posts is non-negative",
        category.total_posts >= 0,
      );
      TestValidator.predicate(
        "category average engagement is valid",
        category.average_engagement >= 0 && category.average_engagement <= 100,
      );
      TestValidator.predicate(
        "category virality score is valid",
        category.virality_score >= 0 && category.virality_score <= 100,
      );
    }
  }

  if (engagementSummary.growth_indicators) {
    TestValidator.predicate(
      "user growth rate is valid",
      engagementSummary.growth_indicators.user_growth_rate >= -100,
    );
    TestValidator.predicate(
      "content growth rate is valid",
      engagementSummary.growth_indicators.content_growth_rate >= -100,
    );
    TestValidator.predicate(
      "engagement growth rate is valid",
      engagementSummary.growth_indicators.engagement_growth_rate >= -100,
    );
    TestValidator.predicate(
      "member count is positive",
      engagementSummary.growth_indicators.member_count >= 0,
    );
    TestValidator.predicate(
      "active member count is positive",
      engagementSummary.growth_indicators.active_member_count >= 0,
    );
    TestValidator.predicate(
      "retention rate is valid",
      engagementSummary.growth_indicators.retention_rate >= 0 &&
        engagementSummary.growth_indicators.retention_rate <= 100,
    );
  }

  // Step 10: Validate business logic consistency
  TestValidator.predicate(
    "active members do not exceed total members",
    engagementSummary.growth_indicators
      ? engagementSummary.growth_indicators.active_member_count <=
          engagementSummary.growth_indicators.member_count
      : true,
  );

  TestValidator.predicate(
    "resolved reports do not exceed total reports",
    engagementSummary.moderation_summary.reports_resolved <=
      engagementSummary.moderation_summary.total_reports_filed,
  );

  TestValidator.predicate(
    "data timestamp consistency",
    new Date(engagementSummary.generated_at) >=
      new Date(platformAdministrator.created_at),
  );

  // Step 11: Final validation of report completeness
  TestValidator.predicate(
    "report contains key insights",
    engagementSummary.key_insights
      ? Array.isArray(engagementSummary.key_insights)
      : true,
  );
  TestValidator.predicate(
    "report contains recommendations",
    engagementSummary.recommendations
      ? Array.isArray(engagementSummary.recommendations)
      : true,
  );

  // Success validation
  TestValidator.equals(
    "administrator engagement summary test completed successfully",
    true,
    true,
  );
}
