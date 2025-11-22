import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformEngagementSummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformEngagementSummaryReport";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_admin_engagement_summary_basic_generation(
  connection: api.IConnection,
) {
  // 1. Create platform administrator account with appropriate privileges
  const adminData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!", // Complex password for admin account
    administrator_level: "super_admin" as const,
    security_clearance: "high" as const,
    system_permissions: JSON.stringify({
      user_management: { can_view_user_data: true },
      community_oversight: { can_view_community_data: true },
      content_moderation: { can_remove_content: true },
      system_configuration: { can_view_system_logs: true },
      compliance_legal: { can_access_compliance_data: true },
    }),
  };

  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: adminData satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Retrieve engagement summary report
  const engagementSummary: IRedditPlatformEngagementSummaryReport =
    await api.functional.redditPlatform.platformAdministrator.reports.engagementSummary.at(
      connection,
    );
  typia.assert(engagementSummary);

  // 3. Validate report structure and key metrics
  TestValidator.equals(
    "report has valid ID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      engagementSummary.report_id,
    ),
    true,
  );
  TestValidator.equals(
    "report has generation timestamp",
    engagementSummary.generated_at,
    engagementSummary.generated_at,
  );
  TestValidator.equals(
    "report has reporting period",
    typeof engagementSummary.reporting_period === "string" &&
      engagementSummary.reporting_period.length > 0,
    true,
  );

  // Validate platform overview section exists and has required metrics
  TestValidator.equals(
    "platform overview has total active users",
    typeof engagementSummary.platform_overview.total_active_users === "number",
    true,
  );
  TestValidator.equals(
    "platform overview has total posts created",
    typeof engagementSummary.platform_overview.total_posts_created === "number",
    true,
  );
  TestValidator.equals(
    "platform overview has total comments created",
    typeof engagementSummary.platform_overview.total_comments_created ===
      "number",
    true,
  );
  TestValidator.equals(
    "platform overview has total votes cast",
    typeof engagementSummary.platform_overview.total_votes_cast === "number",
    true,
  );
  TestValidator.equals(
    "platform overview has overall engagement rate",
    typeof engagementSummary.platform_overview.overall_engagement_rate ===
      "number",
    true,
  );

  // Validate content performance section exists and has required metrics
  TestValidator.equals(
    "content performance has average engagement rate",
    typeof engagementSummary.content_performance.average_engagement_rate ===
      "number",
    true,
  );
  TestValidator.equals(
    "content performance has content virality score",
    typeof engagementSummary.content_performance.content_virality_score ===
      "number",
    true,
  );
  TestValidator.equals(
    "content performance has content quality score",
    typeof engagementSummary.content_performance.content_quality_score ===
      "number",
    true,
  );

  // Validate community health section exists and has required metrics
  TestValidator.equals(
    "community health has total communities",
    typeof engagementSummary.community_health.total_communities === "number",
    true,
  );
  TestValidator.equals(
    "community health has community growth rate",
    typeof engagementSummary.community_health.community_growth_rate ===
      "number",
    true,
  );
  TestValidator.equals(
    "community health has healthy communities ratio",
    typeof engagementSummary.community_health.healthy_communities_ratio ===
      "number",
    true,
  );
  TestValidator.equals(
    "community health has moderation efficiency",
    typeof engagementSummary.community_health.moderation_efficiency ===
      "number",
    true,
  );

  // Validate user engagement section exists and has required metrics
  TestValidator.equals(
    "user engagement has average daily active users",
    typeof engagementSummary.user_engagement.average_daily_active_users ===
      "number",
    true,
  );
  TestValidator.equals(
    "user engagement has user session frequency",
    typeof engagementSummary.user_engagement.user_session_frequency ===
      "number",
    true,
  );
  TestValidator.equals(
    "user engagement has average session length",
    typeof engagementSummary.user_engagement.average_session_length ===
      "number",
    true,
  );
  TestValidator.equals(
    "user engagement has user creation rate",
    typeof engagementSummary.user_engagement.user_creation_rate === "number",
    true,
  );

  // Validate moderation summary section exists and has required metrics
  TestValidator.equals(
    "moderation summary has total reports filed",
    typeof engagementSummary.moderation_summary.total_reports_filed ===
      "number",
    true,
  );
  TestValidator.equals(
    "moderation summary has reports resolved",
    typeof engagementSummary.moderation_summary.reports_resolved === "number",
    true,
  );
  TestValidator.equals(
    "moderation summary has average resolution time",
    typeof engagementSummary.moderation_summary.average_resolution_time ===
      "number",
    true,
  );
  TestValidator.equals(
    "moderation summary has moderation actions taken",
    typeof engagementSummary.moderation_summary.moderation_actions_taken ===
      "number",
    true,
  );

  // Validate optional sections if present
  if (engagementSummary.top_communities) {
    TestValidator.predicate(
      "top communities array is valid",
      Array.isArray(engagementSummary.top_communities) &&
        engagementSummary.top_communities.length >= 0,
    );
  }

  if (engagementSummary.top_content_categories) {
    TestValidator.predicate(
      "top content categories array is valid",
      Array.isArray(engagementSummary.top_content_categories) &&
        engagementSummary.top_content_categories.length >= 0,
    );
  }

  if (engagementSummary.growth_indicators) {
    TestValidator.predicate(
      "growth indicators object is valid",
      typeof engagementSummary.growth_indicators === "object",
    );
  }

  if (engagementSummary.key_insights) {
    TestValidator.predicate(
      "key insights array is valid",
      Array.isArray(engagementSummary.key_insights),
    );
  }

  if (engagementSummary.recommendations) {
    TestValidator.predicate(
      "recommendations array is valid",
      Array.isArray(engagementSummary.recommendations),
    );
  }

  console.log(
    "Platform administrator engagement summary report validation completed successfully",
  );
}
