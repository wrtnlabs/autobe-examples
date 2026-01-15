import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardArticleAggregatedReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAggregatedReport";
import type { IDiscussionBoardArticleAggregatedReportModeratorActionTiming } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAggregatedReportModeratorActionTiming";
import type { IDiscussionBoardArticleAggregatedReportModeratorActionTypeDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAggregatedReportModeratorActionTypeDistribution";
import type { IDiscussionBoardArticleAggregatedReportReportAgeDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAggregatedReportReportAgeDistribution";
import type { IDiscussionBoardArticleAggregatedReportReportRejectionReasonDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAggregatedReportReportRejectionReasonDistribution";
import type { IDiscussionBoardArticleAggregatedReportReportTypeDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAggregatedReportReportTypeDistribution";
export async function test_api_article_aggregated_report_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const report: IDiscussionBoardArticleAggregatedReport =
    await api.functional.discussionBoard.reports.articles.aggregated.index(
      connection,
    );
  typia.assert(report);
  // Validate total numbers are non-negative integers
  TestValidator.predicate("total_articles >= 0", report.total_articles >= 0);
  TestValidator.predicate("total_reports >= 0", report.total_reports >= 0);
  TestValidator.predicate(
    "published_articles_count >= 0",
    report.published_articles_count >= 0,
  );
  TestValidator.predicate(
    "draft_articles_count >= 0",
    report.draft_articles_count >= 0,
  );
  TestValidator.predicate(
    "hidden_articles_count >= 0",
    report.hidden_articles_count >= 0,
  );
  TestValidator.predicate(
    "deleted_articles_count >= 0",
    report.deleted_articles_count >= 0,
  );
  TestValidator.predicate(
    "reported_articles_count >= 0",
    report.reported_articles_count >= 0,
  );
  TestValidator.predicate(
    "top_reported_category_count >= 0",
    report.top_reported_category_count >= 0,
  );
  TestValidator.predicate(
    "moderator_active_count >= 0",
    report.moderator_active_count >= 0,
  );
  TestValidator.predicate(
    "total_unique_reporters >= 0",
    report.total_unique_reporters >= 0,
  );
  TestValidator.predicate(
    "top_moderator_action_count >= 0",
    report.top_moderator_action_count >= 0,
  );
  TestValidator.predicate(
    "total_moderator_actions >= 0",
    report.total_moderator_actions >= 0,
  );
  TestValidator.predicate(
    "total_resolved_reports >= 0",
    report.total_resolved_reports >= 0,
  );
  TestValidator.predicate(
    "total_unresolved_reports >= 0",
    report.total_unresolved_reports >= 0,
  );
  TestValidator.predicate(
    "report_backlog_count >= 0",
    report.report_backlog_count >= 0,
  );
  // Validate percentages are between 0 and 1
  TestValidator.predicate(
    "report_resolution_rate between 0 and 1",
    report.report_resolution_rate >= 0 && report.report_resolution_rate <= 1,
  );
  TestValidator.predicate(
    "reporter_anonymity_rate between 0 and 1",
    report.reporter_anonymity_rate >= 0 && report.reporter_anonymity_rate <= 1,
  );
  TestValidator.predicate(
    "report_accuracy_rate between 0 and 1",
    report.report_accuracy_rate >= 0 && report.report_accuracy_rate <= 1,
  );
  TestValidator.predicate(
    "moderation_efficiency_ratio between 0 and 1",
    report.moderation_efficiency_ratio >= 0 &&
      report.moderation_efficiency_ratio <= 1,
  );
  TestValidator.predicate(
    "status_change_ratio between 0 and 1",
    report.status_change_ratio >= 0 && report.status_change_ratio <= 1,
  );
  TestValidator.predicate(
    "reported_article_ratio between 0 and 1",
    report.reported_article_ratio >= 0 && report.reported_article_ratio <= 1,
  );
  TestValidator.predicate(
    "moderator_utilization_rate between 0 and 1",
    report.moderator_utilization_rate >= 0 &&
      report.moderator_utilization_rate <= 1,
  );
  TestValidator.predicate(
    "report_satisfaction_rate between 0 and 1",
    report.report_satisfaction_rate >= 0 &&
      report.report_satisfaction_rate <= 1,
  );
  TestValidator.predicate(
    "article_retention_rate between 0 and 1",
    report.article_retention_rate >= 0 && report.article_retention_rate <= 1,
  );
  TestValidator.predicate(
    "moderation_response_coverage between 0 and 1",
    report.moderation_response_coverage >= 0 &&
      report.moderation_response_coverage <= 1,
  );
  // Validate trend values are between -100 and 100
  TestValidator.predicate(
    "monthly_report_trend between -100 and 100",
    report.monthly_report_trend >= -100 && report.monthly_report_trend <= 100,
  );
  TestValidator.predicate(
    "weekly_report_trend between -100 and 100",
    report.weekly_report_trend >= -100 && report.weekly_report_trend <= 100,
  );
  // Validate platform health score is between 0 and 100
  TestValidator.predicate(
    "overall_platform_health_score between 0 and 100",
    report.overall_platform_health_score >= 0 &&
      report.overall_platform_health_score <= 100,
  );
  // Validate string fields have appropriate length
  TestValidator.predicate(
    "top_reported_category_name length <= 255",
    report.top_reported_category_name.length <= 255,
  );
  // Validate date-time format
  TestValidator.predicate(
    "last_updated is ISO 8601 date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(?:Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
      report.last_updated,
    ),
  );
  // Validate nested report_age_distribution properties are non-negative integers
  TestValidator.predicate(
    "report_age_distribution.hours_0_1 >= 0",
    report.report_age_distribution.hours_0_1 >= 0,
  );
  TestValidator.predicate(
    "report_age_distribution.hours_1_24 >= 0",
    report.report_age_distribution.hours_1_24 >= 0,
  );
  TestValidator.predicate(
    "report_age_distribution.days_1_7 >= 0",
    report.report_age_distribution.days_1_7 >= 0,
  );
  TestValidator.predicate(
    "report_age_distribution.days_7_30 >= 0",
    report.report_age_distribution.days_7_30 >= 0,
  );
  TestValidator.predicate(
    "report_age_distribution.days_31_180 >= 0",
    report.report_age_distribution.days_31_180 >= 0,
  );
  TestValidator.predicate(
    "report_age_distribution.days_181_plus >= 0",
    report.report_age_distribution.days_181_plus >= 0,
  );
  // Validate moderator_action_type_distribution properties are non-negative integers
  TestValidator.predicate(
    "moderator_action_type_distribution.dismiss >= 0",
    report.moderator_action_type_distribution.dismiss >= 0,
  );
  TestValidator.predicate(
    "moderator_action_type_distribution.remove >= 0",
    report.moderator_action_type_distribution.remove >= 0,
  );
  TestValidator.predicate(
    "moderator_action_type_distribution.warn >= 0",
    report.moderator_action_type_distribution.warn >= 0,
  );
  TestValidator.predicate(
    "moderator_action_type_distribution.suspension >= 0",
    report.moderator_action_type_distribution.suspension >= 0,
  );
  TestValidator.predicate(
    "moderator_action_type_distribution.ban >= 0",
    report.moderator_action_type_distribution.ban >= 0,
  );
  // Validate report_type_distribution properties are non-negative integers
  TestValidator.predicate(
    "report_type_distribution.harassment >= 0",
    report.report_type_distribution.harassment >= 0,
  );
  TestValidator.predicate(
    "report_type_distribution.spam >= 0",
    report.report_type_distribution.spam >= 0,
  );
  TestValidator.predicate(
    "report_type_distribution.misinformation >= 0",
    report.report_type_distribution.misinformation >= 0,
  );
  TestValidator.predicate(
    "report_type_distribution.insults >= 0",
    report.report_type_distribution.insults >= 0,
  );
  TestValidator.predicate(
    "report_type_distribution.offensive_content >= 0",
    report.report_type_distribution.offensive_content >= 0,
  );
  TestValidator.predicate(
    "report_type_distribution.impersonation >= 0",
    report.report_type_distribution.impersonation >= 0,
  );
  TestValidator.predicate(
    "report_type_distribution.copyright_violation >= 0",
    report.report_type_distribution.copyright_violation >= 0,
  );
  TestValidator.predicate(
    "report_type_distribution.privacy_violation >= 0",
    report.report_type_distribution.privacy_violation >= 0,
  );
  TestValidator.predicate(
    "report_type_distribution.other >= 0",
    report.report_type_distribution.other >= 0,
  );
  TestValidator.predicate(
    "report_type_distribution.no_reason_given >= 0",
    report.report_type_distribution.no_reason_given >= 0,
  );
  // Validate average reports per article is non-negative
  TestValidator.predicate(
    "average_reports_per_article >= 0",
    report.average_reports_per_article >= 0,
  );
  // Validate article status change frequency is non-negative
  TestValidator.predicate(
    "article_status_change_frequency >= 0",
    report.article_status_change_frequency >= 0,
  );
  // Validate report_rejection_reason_distribution is a string (empty or JSON)
  TestValidator.predicate(
    "report_rejection_reason_distribution is string",
    typeof report.report_rejection_reason_distribution === "string",
  );
  // Validate moderator_action_timing is an empty object (no properties required)
  TestValidator.predicate(
    "moderator_action_timing is object",
    report.moderator_action_timing !== null &&
      typeof report.moderator_action_timing === "object",
  );
  // Validate that all values are appropriate according to type constraints
  // Note: typia.assert already verifies all type constraints including tags.
}
