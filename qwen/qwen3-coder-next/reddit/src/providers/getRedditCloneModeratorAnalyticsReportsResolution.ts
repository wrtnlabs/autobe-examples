import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReportResolution";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneModeratorAnalyticsReportsResolution(props: {
  moderator: ModeratorPayload;
}): Promise<IRedditCloneContentReportResolution> {
  // Get all report resolutions for the moderator's communities
  const resolutions =
    await MyGlobal.prisma.reddit_clone_content_report_resolutions.findMany({
      where: {
        moderator_id: props.moderator.id,
      },
      select: {
        id: true,
        report_id: true,
        moderator_id: true,
        action: true,
        reason: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
      },
    });
  // Get report creation times for resolution time calculation
  const reportIds = resolutions.map((r) => r.report_id);
  const reports = await MyGlobal.prisma.reddit_clone_content_reports.findMany({
    where: {
      id: { in: reportIds },
    },
    select: {
      id: true,
      created_at: true,
    },
  });
  // Create a map for quick lookup
  const reportCreationMap = new Map(reports.map((r) => [r.id, r.created_at]));
  // Calculate analytics metrics
  const totalReports = resolutions.length;
  const approvedCount = resolutions.filter(
    (r) => r.action === "approve",
  ).length;
  const dismissedCount = resolutions.filter(
    (r) => r.action === "dismiss",
  ).length;
  // Calculate resolution times
  let totalResolutionTimeMs = 0;
  let resolutionTimeCount = 0;
  resolutions.forEach((resolution) => {
    const reportCreated = reportCreationMap.get(resolution.report_id);
    if (reportCreated && resolution.resolved_at) {
      const resolutionTime =
        resolution.resolved_at.getTime() - reportCreated.getTime();
      if (resolutionTime >= 0) {
        totalResolutionTimeMs += resolutionTime;
        resolutionTimeCount++;
      }
    }
  });
  const averageResolutionTimeMs =
    resolutionTimeCount > 0 ? totalResolutionTimeMs / resolutionTimeCount : 0;
  const approvalRate =
    totalReports > 0 ? (approvedCount / totalReports) * 100 : 0;
  const dismissalRate =
    totalReports > 0 ? (dismissedCount / totalReports) * 100 : 0;
  // Get time-based breakdowns (daily, weekly, monthly)
  const dailyBreakdown =
    await MyGlobal.prisma.reddit_clone_content_report_resolutions.groupBy({
      by: ["action"],
      where: {
        moderator_id: props.moderator.id,
        resolved_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      _count: {
        action: true,
      },
    });
  // Convert dates to proper format
  const now = new Date();
  // Return analytics summary as a resolution record
  return {
    id: v4() as string & tags.Format<"uuid">,
    reportId: v4() as string & tags.Format<"uuid">,
    moderatorId: props.moderator.id as string & tags.Format<"uuid">,
    action: "analytics",
    reason: JSON.stringify({
      totalReports,
      approvedCount,
      dismissedCount,
      approvalRate: Math.round(approvalRate * 100) / 100,
      dismissalRate: Math.round(dismissalRate * 100) / 100,
      averageResolutionTimeSeconds: Math.round(averageResolutionTimeMs / 1000),
      dailyBreakdown,
    }),
    resolvedAt: now.toISOString() as string & tags.Format<"date-time">,
    createdAt: now.toISOString() as string & tags.Format<"date-time">,
    updatedAt: now.toISOString() as string & tags.Format<"date-time">,
  };
}
