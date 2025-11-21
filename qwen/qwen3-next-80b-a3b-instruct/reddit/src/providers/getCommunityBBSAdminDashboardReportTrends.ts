import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageICommunityBBSReportTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBBSReportTrend";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBBSReportTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSReportTrend";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityBBSAdminDashboardReportTrends(props: {
  admin: AdminPayload;
}): Promise<IPageICommunityBBSReportTrend.ISummary> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const reports = await MyGlobal.prisma.community_bbs_reports.findMany({
    where: {
      deleted_at: null,
      created_at: {
        gte: thirtyDaysAgo,
      },
      status: {
        in: ["pending", "approved", "rejected"],
      },
    },
    include: {
      reason: true,
    },
    orderBy: {
      created_at: "asc",
    },
  });

  const aggregated: Record<
    string,
    { count: number; categoryCounts: Record<string, number> }
  > = {};

  reports.forEach((report) => {
    const dateStr = toISOStringSafe(report.created_at).split("T")[0];
    if (!aggregated[dateStr]) {
      aggregated[dateStr] = { count: 0, categoryCounts: {} };
    }
    aggregated[dateStr].count++;
    const category = report.reason.name;
    aggregated[dateStr].categoryCounts[category] =
      (aggregated[dateStr].categoryCounts[category] || 0) + 1;
  });

  const summaryData: ICommunityBBSReportTrend.ISummary[] = Object.entries(
    aggregated,
  ).map(([date, data]) => {
    const total = data.count;
    const approved =
      data.categoryCounts["spam"] ||
      0 + data.categoryCounts["harassment"] ||
      0 + data.categoryCounts["hate_speech"] ||
      0 + data.categoryCounts["off_topic"] ||
      0;
    const resolutionRate = total > 0 ? approved / total : 0;
    return `Daily report volume: ${total} | Category distribution: Spam: ${data.categoryCounts["spam"] || 0}, Harassment: ${data.categoryCounts["harassment"] || 0}, Hate Speech: ${data.categoryCounts["hate_speech"] || 0}, Off-topic: ${data.categoryCounts["off_topic"] || 0} | Resolution rate: ${(resolutionRate * 100).toFixed(1)}%`;
  });

  const pagination: IPage.IPagination = {
    current: 1,
    limit: summaryData.length,
    records: summaryData.length,
    pages: 1,
  };

  return {
    pagination,
    data: summaryData,
  };
}
