import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationStatistics";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that the moderation statistics endpoint returns valid baseline metrics
 * when minimal moderation activity exists.
 *
 * This test validates the statistics calculation handles low-activity scenarios
 * and provides meaningful zero or near-zero metrics without division by zero
 * errors or null pointer exceptions.
 *
 * Test steps:
 *
 * 1. Register and authenticate as a moderator
 * 2. Retrieve moderation statistics from the dashboard
 * 3. Validate overview metrics show valid baseline values
 * 4. Validate report metrics handle empty state correctly
 * 5. Validate moderation action metrics show zero activity
 * 6. Validate moderator workload calculations work with minimal data
 * 7. Validate user behavior metrics handle division-by-zero gracefully
 * 8. Validate content health metrics calculate percentages correctly
 * 9. Validate temporal trends contain proper data structures
 */
export async function test_api_moderation_statistics_baseline_metrics(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a moderator
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Test1234!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Retrieve moderation statistics
  const statistics: IDiscussionBoardModerationStatistics =
    await api.functional.discussionBoard.moderator.moderation.dashboard.statistics(
      connection,
    );
  typia.assert(statistics);

  // Step 3: Validate overview metrics show valid baseline values
  TestValidator.predicate(
    "pending reports count is non-negative",
    statistics.overview.pendingReportsCount >= 0,
  );
  TestValidator.predicate(
    "under review reports count is non-negative",
    statistics.overview.underReviewReportsCount >= 0,
  );
  TestValidator.predicate(
    "resolved reports last 24 hours is non-negative",
    statistics.overview.resolvedReportsLast24Hours >= 0,
  );
  TestValidator.predicate(
    "active suspensions count is non-negative",
    statistics.overview.activeSuspensionsCount >= 0,
  );
  TestValidator.predicate(
    "warnings issued last week is non-negative",
    statistics.overview.warningsIssuedLastWeek >= 0,
  );
  TestValidator.predicate(
    "average report resolution time is non-negative",
    statistics.overview.averageReportResolutionTimeHours >= 0,
  );
  TestValidator.predicate(
    "report accuracy percentage is valid",
    statistics.overview.reportAccuracyPercentage >= 0 &&
      statistics.overview.reportAccuracyPercentage <= 100,
  );

  // Step 4: Validate report metrics handle empty state correctly
  TestValidator.predicate(
    "total reports all time is non-negative",
    statistics.reportMetrics.totalReportsAllTime >= 0,
  );
  TestValidator.predicate(
    "reports last 24 hours is non-negative",
    statistics.reportMetrics.reportsLast24Hours >= 0,
  );
  TestValidator.predicate(
    "reports last week is non-negative",
    statistics.reportMetrics.reportsLastWeek >= 0,
  );
  TestValidator.predicate(
    "reports last month is non-negative",
    statistics.reportMetrics.reportsLastMonth >= 0,
  );
  TestValidator.predicate(
    "average resolution time is non-negative",
    statistics.reportMetrics.averageResolutionTimeHours >= 0,
  );
  TestValidator.predicate(
    "reports by violation type is an array",
    Array.isArray(statistics.reportMetrics.reportsByViolationType),
  );
  TestValidator.predicate(
    "report accuracy rate is valid percentage",
    statistics.reportMetrics.reportAccuracyRate >= 0 &&
      statistics.reportMetrics.reportAccuracyRate <= 100,
  );
  TestValidator.predicate(
    "multiple reported content count is non-negative",
    statistics.reportMetrics.multipleReportedContentCount >= 0,
  );

  // Step 5: Validate moderation action metrics show zero or minimal activity
  TestValidator.predicate(
    "total actions all time is non-negative",
    statistics.moderationActionMetrics.totalActionsAllTime >= 0,
  );
  TestValidator.predicate(
    "actions last 24 hours is non-negative",
    statistics.moderationActionMetrics.actionsLast24Hours >= 0,
  );
  TestValidator.predicate(
    "actions last week is non-negative",
    statistics.moderationActionMetrics.actionsLastWeek >= 0,
  );
  TestValidator.predicate(
    "actions last month is non-negative",
    statistics.moderationActionMetrics.actionsLastMonth >= 0,
  );
  TestValidator.predicate(
    "actions by type is an array",
    Array.isArray(statistics.moderationActionMetrics.actionsByType),
  );
  TestValidator.predicate(
    "actions by target type is an array",
    Array.isArray(statistics.moderationActionMetrics.actionsByTargetType),
  );

  // Step 6: Validate moderator workload calculations work with minimal data
  TestValidator.predicate(
    "total active moderators is non-negative",
    statistics.moderatorWorkload.totalActiveModerators >= 0,
  );
  TestValidator.predicate(
    "average reports per moderator is non-negative",
    statistics.moderatorWorkload.averageReportsPerModerator >= 0,
  );
  TestValidator.predicate(
    "average actions per moderator is non-negative",
    statistics.moderatorWorkload.averageActionsPerModerator >= 0,
  );
  TestValidator.predicate(
    "moderator activity is an array",
    Array.isArray(statistics.moderatorWorkload.moderatorActivity),
  );

  // Step 7: Validate user behavior metrics handle division-by-zero gracefully
  TestValidator.predicate(
    "total users warned is non-negative",
    statistics.userBehaviorMetrics.totalUsersWarned >= 0,
  );
  TestValidator.predicate(
    "total users suspended is non-negative",
    statistics.userBehaviorMetrics.totalUsersSuspended >= 0,
  );
  TestValidator.predicate(
    "repeat offenders count is non-negative",
    statistics.userBehaviorMetrics.repeatOffendersCount >= 0,
  );
  TestValidator.predicate(
    "repeat offender rate is valid percentage",
    statistics.userBehaviorMetrics.repeatOffenderRate >= 0 &&
      statistics.userBehaviorMetrics.repeatOffenderRate <= 100,
  );
  TestValidator.predicate(
    "average days between violations is non-negative",
    statistics.userBehaviorMetrics.averageDaysBetweenViolations >= 0,
  );
  TestValidator.predicate(
    "warning to ban conversion rate is valid percentage",
    statistics.userBehaviorMetrics.warningToBanConversionRate >= 0 &&
      statistics.userBehaviorMetrics.warningToBanConversionRate <= 100,
  );

  // Step 8: Validate content health metrics calculate percentages correctly
  TestValidator.predicate(
    "total articles count is non-negative",
    statistics.contentHealthMetrics.totalArticlesCount >= 0,
  );
  TestValidator.predicate(
    "total comments count is non-negative",
    statistics.contentHealthMetrics.totalCommentsCount >= 0,
  );
  TestValidator.predicate(
    "reported articles percentage is valid",
    statistics.contentHealthMetrics.reportedArticlesPercentage >= 0 &&
      statistics.contentHealthMetrics.reportedArticlesPercentage <= 100,
  );
  TestValidator.predicate(
    "reported comments percentage is valid",
    statistics.contentHealthMetrics.reportedCommentsPercentage >= 0 &&
      statistics.contentHealthMetrics.reportedCommentsPercentage <= 100,
  );
  TestValidator.predicate(
    "moderation intervention rate is valid percentage",
    statistics.contentHealthMetrics.moderationInterventionRate >= 0 &&
      statistics.contentHealthMetrics.moderationInterventionRate <= 100,
  );
  TestValidator.predicate(
    "deleted content percentage is valid",
    statistics.contentHealthMetrics.deletedContentPercentage >= 0 &&
      statistics.contentHealthMetrics.deletedContentPercentage <= 100,
  );

  // Step 9: Validate temporal trends contain proper data structures
  TestValidator.predicate(
    "hourly reports last 24 hours is an array",
    Array.isArray(statistics.temporalTrends.hourlyReportsLast24Hours),
  );
  TestValidator.predicate(
    "daily reports last week is an array",
    Array.isArray(statistics.temporalTrends.dailyReportsLastWeek),
  );
  TestValidator.predicate(
    "weekly reports last month is an array",
    Array.isArray(statistics.temporalTrends.weeklyReportsLastMonth),
  );
  TestValidator.predicate(
    "daily actions last week is an array",
    Array.isArray(statistics.temporalTrends.dailyActionsLastWeek),
  );
  TestValidator.predicate(
    "monthly actions last year is an array",
    Array.isArray(statistics.temporalTrends.monthlyActionsLastYear),
  );

  // Validate that time-series arrays contain valid data points with non-negative counts
  if (statistics.temporalTrends.hourlyReportsLast24Hours.length > 0) {
    const firstHourlyDataPoint =
      statistics.temporalTrends.hourlyReportsLast24Hours[0];
    typia.assert(firstHourlyDataPoint);
    TestValidator.predicate(
      "hourly data point count is non-negative",
      firstHourlyDataPoint.count >= 0,
    );
  }

  if (statistics.temporalTrends.dailyReportsLastWeek.length > 0) {
    const firstDailyDataPoint =
      statistics.temporalTrends.dailyReportsLastWeek[0];
    typia.assert(firstDailyDataPoint);
    TestValidator.predicate(
      "daily data point count is non-negative",
      firstDailyDataPoint.count >= 0,
    );
  }
}
