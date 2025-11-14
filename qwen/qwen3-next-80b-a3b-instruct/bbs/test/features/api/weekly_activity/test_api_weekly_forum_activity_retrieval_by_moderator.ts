import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";
import type { IPoliticalForumWeeklyActivityMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumWeeklyActivityMetrics";
import type { IPoliticalForumWeeklyActivityRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumWeeklyActivityRequest";

export async function test_api_weekly_forum_activity_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IPoliticalForumModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Retrieve weekly activity metrics
  const weeklyMetrics: IPoliticalForumWeeklyActivityMetrics =
    await api.functional.politicalForum.moderator.reports.weekly_activity.search(
      connection,
      {
        body: {
          // Default parameters: start date 7 days ago, end date now,
          // include both post and comment reports, weekly aggregation
          // no content type filtering
        } satisfies IPoliticalForumWeeklyActivityRequest,
      },
    );
  typia.assert(weeklyMetrics);

  // 3. Validate all metrics are present and within constraints
  TestValidator.predicate(
    "totalPosts is non-negative",
    weeklyMetrics.totalPosts >= 0,
  );
  TestValidator.predicate(
    "totalComments is non-negative",
    weeklyMetrics.totalComments >= 0,
  );
  TestValidator.predicate(
    "totalPostReports is non-negative",
    weeklyMetrics.totalPostReports >= 0,
  );
  TestValidator.predicate(
    "totalCommentReports is non-negative",
    weeklyMetrics.totalCommentReports >= 0,
  );
  TestValidator.predicate(
    "commentToPostRatio is between 0 and 1000",
    weeklyMetrics.commentToPostRatio >= 0 &&
      weeklyMetrics.commentToPostRatio <= 1000,
  );
  TestValidator.predicate(
    "reportToContentRatio is between 0 and 10",
    weeklyMetrics.reportToContentRatio >= 0 &&
      weeklyMetrics.reportToContentRatio <= 10,
  );

  // Validate arrays have correct length (1-7 days)
  TestValidator.predicate(
    "postsByDay has between 1 and 7 items",
    weeklyMetrics.postsByDay.length >= 1 &&
      weeklyMetrics.postsByDay.length <= 7,
  );
  TestValidator.predicate(
    "commentsByDay has between 1 and 7 items",
    weeklyMetrics.commentsByDay.length >= 1 &&
      weeklyMetrics.commentsByDay.length <= 7,
  );
  TestValidator.predicate(
    "postReportsByDay has between 1 and 7 items",
    weeklyMetrics.postReportsByDay.length >= 1 &&
      weeklyMetrics.postReportsByDay.length <= 7,
  );
  TestValidator.predicate(
    "commentReportsByDay has between 1 and 7 items",
    weeklyMetrics.commentReportsByDay.length >= 1 &&
      weeklyMetrics.commentReportsByDay.length <= 7,
  );

  // Validate each daily entry has correct structure and constraints
  for (const day of weeklyMetrics.postsByDay) {
    TestValidator.equals(
      "date format is YYYY-MM-DD",
      day.date,
      new Date(day.date).toISOString().split("T")[0],
    );
    TestValidator.predicate("post count is non-negative", day.count >= 0);
  }

  for (const day of weeklyMetrics.commentsByDay) {
    TestValidator.equals(
      "date format is YYYY-MM-DD",
      day.date,
      new Date(day.date).toISOString().split("T")[0],
    );
    TestValidator.predicate("comment count is non-negative", day.count >= 0);
  }

  for (const day of weeklyMetrics.postReportsByDay) {
    TestValidator.equals(
      "date format is YYYY-MM-DD",
      day.date,
      new Date(day.date).toISOString().split("T")[0],
    );
    TestValidator.predicate(
      "post report count is non-negative",
      day.count >= 0,
    );
  }

  for (const day of weeklyMetrics.commentReportsByDay) {
    TestValidator.equals(
      "date format is YYYY-MM-DD",
      day.date,
      new Date(day.date).toISOString().split("T")[0],
    );
    TestValidator.predicate(
      "comment report count is non-negative",
      day.count >= 0,
    );
  }

  // Validate trend indicators have valid values
  const validTrends: ("increase" | "decrease" | "stable")[] = [
    "increase",
    "decrease",
    "stable",
  ];
  TestValidator.predicate(
    "postGrowth is valid",
    validTrends.includes(weeklyMetrics.trendIndicators.postGrowth),
  );
  TestValidator.predicate(
    "commentGrowth is valid",
    validTrends.includes(weeklyMetrics.trendIndicators.commentGrowth),
  );
  TestValidator.predicate(
    "postReportTrend is valid",
    validTrends.includes(weeklyMetrics.trendIndicators.postReportTrend),
  );
  TestValidator.predicate(
    "commentReportTrend is valid",
    validTrends.includes(weeklyMetrics.trendIndicators.commentReportTrend),
  );
}
