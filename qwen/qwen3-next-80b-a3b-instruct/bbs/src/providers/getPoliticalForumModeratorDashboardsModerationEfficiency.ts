import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumModerationEfficiencyMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerationEfficiencyMetrics";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getPoliticalForumModeratorDashboardsModerationEfficiency(props: {
  moderator: ModeratorPayload;
}): Promise<IPoliticalForumModerationEfficiencyMetrics> {
  const thirtyDaysAgo = toISOStringSafe(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );

  const [postReports, commentReports] = await Promise.all([
    MyGlobal.prisma.political_forum_post_reports.findMany({
      where: {
        created_at: {
          gte: thirtyDaysAgo,
        },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.political_forum_comment_reports.findMany({
      where: {
        created_at: {
          gte: thirtyDaysAgo,
        },
        deleted_at: null,
      },
    }),
  ]);

  const allReports = [...postReports, ...commentReports];
  const totalReports = allReports.length;

  if (totalReports === 0) {
    return JSON.stringify({
      totalReports: 0,
      resolvedReports: 0,
      averageResponseTimeInHours: 0,
      resolutionRatePercentage: 0,
    });
  }

  const resolvedReports = allReports.filter(
    (report) => report.status !== "pending",
  ).length;

  const totalResponseTimeMillis = allReports.reduce((acc, report) => {
    if (report.updated_at) {
      const createdMillis = Date.parse(toISOStringSafe(report.created_at));
      const updatedMillis = Date.parse(toISOStringSafe(report.updated_at));
      if (!isNaN(createdMillis) && !isNaN(updatedMillis)) {
        return acc + (updatedMillis - createdMillis);
      }
    }
    return acc;
  }, 0);

  const averageResponseTimeInHours =
    totalReports > 0
      ? totalResponseTimeMillis / (1000 * 60 * 60 * totalReports)
      : 0;
  const resolutionRatePercentage =
    totalReports > 0 ? (resolvedReports / totalReports) * 100 : 0;

  const metrics = {
    totalReports,
    resolvedReports,
    averageResponseTimeInHours,
    resolutionRatePercentage,
  };

  return JSON.stringify(metrics);
}
