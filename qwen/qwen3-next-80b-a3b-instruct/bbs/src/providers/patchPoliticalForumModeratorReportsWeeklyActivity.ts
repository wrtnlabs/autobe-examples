import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumWeeklyActivityRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumWeeklyActivityRequest";
import { IPoliticalForumWeeklyActivityMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumWeeklyActivityMetrics";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchPoliticalForumModeratorReportsWeeklyActivity(props: {
  moderator: ModeratorPayload;
  body: IPoliticalForumWeeklyActivityRequest;
}): Promise<IPoliticalForumWeeklyActivityMetrics> {
  const now = new Date();
  const endDateStr = props.body.endDate || toISOStringSafe(now);
  const startStr =
    props.body.startDate ||
    toISOStringSafe(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));

  const startDateObj = new Date(startStr);
  const endDateObj = new Date(endDateStr);

  // Calculate day count using milliseconds to avoid Date object drift
  const dayMs = 24 * 60 * 60 * 1000;
  const dayCount =
    Math.floor((endDateObj.getTime() - startDateObj.getTime()) / dayMs) + 1;

  // Generate all dates in the range as ISO date strings (YYYY-MM-DD)
  const allDates: string[] = [];
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(startDateObj.getTime() + i * dayMs);
    allDates.push(date.toISOString().split("T")[0]);
  }

  // Build filter conditions
  const whereClause: Record<string, any> = {
    created_at: {
      gte: startStr,
      lte: endDateStr,
    },
    deleted_at: null,
  };

  // Add content type filter if specified
  if (props.body.contentTypes && props.body.contentTypes.length > 0) {
    whereClause.content_type = { in: props.body.contentTypes };
  }

  // Combine report filters
  const reportWhereClause: Record<string, any> = {
    created_at: {
      gte: startStr,
      lte: endDateStr,
    },
    deleted_at: null,
  };

  // Fetch data with direct aggregation
  const [postsByDay, commentsByDay, postReportsByDay, commentReportsByDay] =
    await Promise.all([
      MyGlobal.prisma.political_forum_posts.groupBy({
        by: ["created_at"],
        where: whereClause,
        _count: { created_at: true },
        orderBy: { created_at: "asc" },
      }),
      MyGlobal.prisma.political_forum_comments.groupBy({
        by: ["created_at"],
        where: whereClause,
        _count: { created_at: true },
        orderBy: { created_at: "asc" },
      }),
      MyGlobal.prisma.political_forum_post_reports.groupBy({
        by: ["created_at"],
        where: reportWhereClause,
        _count: { created_at: true },
        orderBy: { created_at: "asc" },
      }),
      MyGlobal.prisma.political_forum_comment_reports.groupBy({
        by: ["created_at"],
        where: reportWhereClause,
        _count: { created_at: true },
        orderBy: { created_at: "asc" },
      }),
    ]);

  // Build maps from grouped results
  const postDayMap = new Map<string, number>();
  const commentDayMap = new Map<string, number>();
  const postReportDayMap = new Map<string, number>();
  const commentReportDayMap = new Map<string, number>();

  // Process posts
  for (const item of postsByDay) {
    const date = item.created_at.toISOString().split("T")[0];
    postDayMap.set(date, item._count.created_at);
  }

  // Process comments
  for (const item of commentsByDay) {
    const date = item.created_at.toISOString().split("T")[0];
    commentDayMap.set(date, item._count.created_at);
  }

  // Process post reports
  for (const item of postReportsByDay) {
    const date = item.created_at.toISOString().split("T")[0];
    postReportDayMap.set(date, item._count.created_at);
  }

  // Process comment reports
  for (const item of commentReportsByDay) {
    const date = item.created_at.toISOString().split("T")[0];
    commentReportDayMap.set(date, item._count.created_at);
  }

  // Create daily arrays with zero-fill for missing dates
  const postsByDayList = allDates.map((date) => ({
    date: date as string & tags.Format<"date">,
    count: postDayMap.get(date) || 0,
  }));

  const commentsByDayList = allDates.map((date) => ({
    date: date as string & tags.Format<"date">,
    count: commentDayMap.get(date) || 0,
  }));

  const postReportsByDayList = allDates.map((date) => ({
    date: date as string & tags.Format<"date">,
    count: postReportDayMap.get(date) || 0,
  }));

  const commentReportsByDayList = allDates.map((date) => ({
    date: date as string & tags.Format<"date">,
    count: commentReportDayMap.get(date) || 0,
  }));

  // Compute totals
  const totalPosts = postsByDayList.reduce((sum, day) => sum + day.count, 0);
  const totalComments = commentsByDayList.reduce(
    (sum, day) => sum + day.count,
    0,
  );
  const totalPostReports = postReportsByDayList.reduce(
    (sum, day) => sum + day.count,
    0,
  );
  const totalCommentReports = commentReportsByDayList.reduce(
    (sum, day) => sum + day.count,
    0,
  );

  // Compute ratios (no rounding — it's consumed by type constraint in DTO)
  const commentToPostRatio = totalPosts === 0 ? 0 : totalComments / totalPosts;
  const reportToContentRatio =
    totalPosts + totalComments === 0
      ? 0
      : (totalPostReports + totalCommentReports) / (totalPosts + totalComments);

  // Calculate previous week range
  const prevStartStr = toISOStringSafe(
    new Date(startDateObj.getTime() - 7 * dayMs),
  );
  const prevEndStr = toISOStringSafe(new Date(startDateObj.getTime() - 1));

  // Fetch previous week totals
  const [
    lastWeekPosts,
    lastWeekComments,
    lastWeekPostReports,
    lastWeekCommentReports,
  ] = await Promise.all([
    MyGlobal.prisma.political_forum_posts.count({
      where: {
        created_at: { gte: prevStartStr, lte: prevEndStr },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.political_forum_comments.count({
      where: {
        created_at: { gte: prevStartStr, lte: prevEndStr },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.political_forum_post_reports.count({
      where: {
        created_at: { gte: prevStartStr, lte: prevEndStr },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.political_forum_comment_reports.count({
      where: {
        created_at: { gte: prevStartStr, lte: prevEndStr },
        deleted_at: null,
      },
    }),
  ]);

  // Determine trend indicators with explicit zero handling
  const postGrowth =
    totalPosts === lastWeekPosts
      ? "stable"
      : totalPosts > lastWeekPosts * 1.05
        ? "increase"
        : totalPosts < lastWeekPosts * 0.95
          ? "decrease"
          : "stable";

  const commentGrowth =
    totalComments === lastWeekComments
      ? "stable"
      : totalComments > lastWeekComments * 1.05
        ? "increase"
        : totalComments < lastWeekComments * 0.95
          ? "decrease"
          : "stable";

  const postReportTrend =
    totalPostReports === lastWeekPostReports
      ? "stable"
      : totalPostReports > lastWeekPostReports * 1.05
        ? "increase"
        : totalPostReports < lastWeekPostReports * 0.95
          ? "decrease"
          : "stable";

  const commentReportTrend =
    totalCommentReports === lastWeekCommentReports
      ? "stable"
      : totalCommentReports > lastWeekCommentReports * 1.05
        ? "increase"
        : totalCommentReports < lastWeekCommentReports * 0.95
          ? "decrease"
          : "stable";

  // Return result, ensuring all types are validated by structure
  return {
    totalPosts,
    totalComments,
    totalPostReports,
    totalCommentReports,
    postsByDay: postsByDayList,
    commentsByDay: commentsByDayList,
    postReportsByDay: postReportsByDayList,
    commentReportsByDay: commentReportsByDayList,
    commentToPostRatio,
    reportToContentRatio,
    trendIndicators: {
      postGrowth,
      commentGrowth,
      postReportTrend,
      commentReportTrend,
    },
  };
}
