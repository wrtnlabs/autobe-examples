import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReportStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportStatistics";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditCommunityModeratorCommunitiesCommunityNameReportsStatistics(props: {
  moderator: ModeratorPayload;
  communityName: string;
}): Promise<IRedditCommunityReportStatistics> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const moderatorAssignment =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        community_id: community.id,
        member_id: props.moderator.id,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "You do not have moderation authority for this community",
      403,
    );
  }

  const allReports = await MyGlobal.prisma.reddit_community_reports.findMany({
    where: {
      reddit_community_community_id: community.id,
      deleted_at: null,
    },
  });

  const [postReportsCount, commentReportsCount] = await Promise.all([
    MyGlobal.prisma.reddit_community_report_of_posts.count({
      where: {
        report: {
          reddit_community_community_id: community.id,
          deleted_at: null,
        },
      },
    }),
    MyGlobal.prisma.reddit_community_report_of_comments.count({
      where: {
        report: {
          reddit_community_community_id: community.id,
          deleted_at: null,
        },
      },
    }),
  ]);

  const total_reports = allReports.length;

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const uniqueReporters = new Set<string>();
  const categoryCounts = new Map<string, number>();
  let pending_reports = 0;
  let resolved_reports = 0;
  let dismissed_reports = 0;
  let reports_last_24h = 0;
  let reports_last_7d = 0;
  let reports_last_30d = 0;

  for (const report of allReports) {
    if (report.status === "pending") pending_reports++;
    if (
      report.status === "resolved_action_taken" ||
      report.status === "resolved_no_violation"
    )
      resolved_reports++;
    if (report.status === "dismissed") dismissed_reports++;

    categoryCounts.set(
      report.category,
      (categoryCounts.get(report.category) || 0) + 1,
    );

    if (report.created_at >= last24h) reports_last_24h++;
    if (report.created_at >= last7d) reports_last_7d++;
    if (report.created_at >= last30d) reports_last_30d++;

    uniqueReporters.add(report.reddit_community_member_id);
  }

  const reports_by_category: { [key: string]: number } = {};
  categoryCounts.forEach((count, category) => {
    reports_by_category[category] = count;
  });

  let most_common_violation: string | null | undefined = null;
  if (categoryCounts.size > 0) {
    let maxCount = 0;
    categoryCounts.forEach((count, category) => {
      if (count > maxCount) {
        maxCount = count;
        most_common_violation = category;
      }
    });
  }

  return {
    total_reports,
    pending_reports,
    resolved_reports,
    dismissed_reports,
    reports_by_category,
    average_resolution_time_hours: null,
    reports_last_24h,
    reports_last_7d,
    reports_last_30d,
    most_common_violation,
    post_reports_count: postReportsCount,
    comment_reports_count: commentReportsCount,
    unique_reporters: uniqueReporters.size,
    repeat_offenders: 0,
  };
}
