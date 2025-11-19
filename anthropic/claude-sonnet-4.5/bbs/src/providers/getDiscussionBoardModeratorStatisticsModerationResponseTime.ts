import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationResponseTimeStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationResponseTimeStatistics";
import { IDiscussionBoardModerationResponseTimeByCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationResponseTimeByCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorStatisticsModerationResponseTime(props: {
  moderator: ModeratorPayload;
}): Promise<IDiscussionBoardModerationResponseTimeStatistics> {
  const resolvedReports =
    await MyGlobal.prisma.discussion_board_content_reports.findMany({
      where: {
        status: {
          in: ["reviewed_no_action", "reviewed_edited", "reviewed_removed"],
        },
        resolved_at: {
          not: null,
        },
      },
      select: {
        report_category: true,
        created_at: true,
        resolved_at: true,
      },
    });

  const reportsWithResponseTimes = resolvedReports.map((report) => {
    const createdMs = new Date(report.created_at).getTime();
    const resolvedMs = new Date(report.resolved_at!).getTime();
    const responseTimeHours = (resolvedMs - createdMs) / (1000 * 60 * 60);
    return {
      category: report.report_category,
      responseTimeHours,
    };
  });

  const responseTimesHours = reportsWithResponseTimes.map(
    (r) => r.responseTimeHours,
  );
  responseTimesHours.sort((a, b) => a - b);

  const averageResponseTime =
    responseTimesHours.length > 0
      ? responseTimesHours.reduce((sum, time) => sum + time, 0) /
        responseTimesHours.length
      : 0;

  const medianResponseTime =
    responseTimesHours.length > 0
      ? responseTimesHours.length % 2 === 0
        ? (responseTimesHours[responseTimesHours.length / 2 - 1] +
            responseTimesHours[responseTimesHours.length / 2]) /
          2
        : responseTimesHours[Math.floor(responseTimesHours.length / 2)]
      : 0;

  const percentile90Index = Math.ceil(responseTimesHours.length * 0.9) - 1;
  const percentile90ResponseTime =
    responseTimesHours.length > 0 && percentile90Index >= 0
      ? responseTimesHours[percentile90Index]
      : 0;

  const resolvedWithin24Hours = responseTimesHours.filter(
    (time) => time <= 24,
  ).length;
  const resolvedWithin7Days = responseTimesHours.filter(
    (time) => time <= 168,
  ).length;

  const percentageResolvedWithin24Hours =
    responseTimesHours.length > 0
      ? (resolvedWithin24Hours / responseTimesHours.length) * 100
      : 0;

  const percentageResolvedWithin7Days =
    responseTimesHours.length > 0
      ? (resolvedWithin7Days / responseTimesHours.length) * 100
      : 0;

  const pendingReportsCount =
    await MyGlobal.prisma.discussion_board_content_reports.count({
      where: {
        status: "pending",
      },
    });

  const categoryMap: Map<string, { times: number[]; count: number }> =
    new Map();

  reportsWithResponseTimes.forEach((report) => {
    const category = report.category;
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { times: [], count: 0 });
    }
    const categoryData = categoryMap.get(category)!;
    categoryData.times.push(report.responseTimeHours);
    categoryData.count += 1;
  });

  const validCategories = new Set([
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ]);
  const responseTimesByCategory: IDiscussionBoardModerationResponseTimeByCategory[] =
    [];

  categoryMap.forEach((data, category) => {
    if (validCategories.has(category)) {
      const avgTime =
        data.times.reduce((sum, time) => sum + time, 0) / data.times.length;
      responseTimesByCategory.push({
        category: category as
          | "Spam"
          | "Offensive Content"
          | "Misinformation"
          | "Off-Topic"
          | "Other",
        average_response_time_hours: avgTime,
        total_reports_resolved: data.count,
      });
    }
  });

  return {
    average_response_time_hours: averageResponseTime,
    median_response_time_hours: medianResponseTime,
    percentile_90_response_time_hours: percentile90ResponseTime,
    percentage_resolved_within_24_hours: percentageResolvedWithin24Hours,
    percentage_resolved_within_7_days: percentageResolvedWithin7Days,
    total_pending_reports: pendingReportsCount,
    response_times_by_category: responseTimesByCategory,
  };
}
