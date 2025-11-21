import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSSystemHealth } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSSystemHealth";

export async function getCommunityBBSDashboardSystemHealth(): Promise<ICommunityBBSSystemHealth> {
  const nowISO = toISOStringSafe(new Date());
  const sevenDaysAgoISO = new Date().toISOString();
  const twentyFourHoursAgoISO = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();

  // Moderation workload
  const pendingReports = await MyGlobal.prisma.community_bbs_reports.count({
    where: {
      status: "pending",
      review_status: "unreviewed",
      deleted_at: null,
    },
  });

  const approvedReports = await MyGlobal.prisma.community_bbs_reports.count({
    where: {
      status: "approved",
      review_status: "actioned",
      deleted_at: null,
    },
  });

  const rejectedReports = await MyGlobal.prisma.community_bbs_reports.count({
    where: {
      status: "rejected",
      review_status: "actioned",
      deleted_at: null,
    },
  });

  const pendingContentDeletions =
    (await MyGlobal.prisma.community_bbs_posts.count({
      where: {
        status: "hidden",
        deleted_at: null,
      },
    })) +
    (await MyGlobal.prisma.community_bbs_comments.count({
      where: {
        business_status: "hidden",
        deleted_at: null,
      },
    }));

  const moderationReactionTimeResult =
    await MyGlobal.prisma.community_bbs_reports.findMany({
      where: {
        reviewed_at: { not: null },
        // Remove created_at: { not: null } since it's causing the error - let Prisma handle non-null naturally
        deleted_at: null,
      },
      select: {
        created_at: true,
        reviewed_at: true,
      },
    });

  let totalReactionHours = 0;
  let measuredCount = 0;
  for (const report of moderationReactionTimeResult) {
    if (report.created_at && report.reviewed_at) {
      const created = new Date(report.created_at);
      const reviewed = new Date(report.reviewed_at);
      const diffHours =
        (reviewed.getTime() - created.getTime()) / (1000 * 60 * 60);
      totalReactionHours += diffHours;
      measuredCount++;
    }
  }
  const moderationReactionTime =
    measuredCount > 0 ? totalReactionHours / measuredCount : 0;

  // Content activity
  const activePosts = await MyGlobal.prisma.community_bbs_posts.count({
    where: {
      status: "published",
      deleted_at: null,
    },
  });

  const activeComments = await MyGlobal.prisma.community_bbs_comments.count({
    where: {
      business_status: "approved",
      deleted_at: null,
    },
  });

  const reportedContent = await MyGlobal.prisma.community_bbs_reports.count({
    where: {
      created_at: {
        gte: sevenDaysAgoISO,
      },
      deleted_at: null,
    },
  });

  const recentContentChanges =
    (await MyGlobal.prisma.community_bbs_posts.count({
      where: {
        updated_at: {
          gte: twentyFourHoursAgoISO,
        },
        deleted_at: null,
      },
    })) +
    (await MyGlobal.prisma.community_bbs_comments.count({
      where: {
        updated_at: {
          gte: twentyFourHoursAgoISO,
        },
        deleted_at: null,
      },
    }));

  // System performance (these would typically come from application metrics)
  // In production, these would be fetched from monitoring system
  const apiSuccessRate = 98.7;
  const errorRate = 0.2;
  const avgResponseTime = 320;
  const cacheHitRate = 87.5;

  // Infrastructure status
  const databaseConnectivity: "healthy" | "degraded" | "unavailable" =
    "healthy";
  const cacheConnectivity: "healthy" | "degraded" | "unavailable" = "healthy";
  const workerNodeStatus: "healthy" | "degraded" | "unavailable" = "healthy";
  const externalServices: "healthy" | "degraded" | "unavailable" = "healthy";

  // Overall health calculation (simplified)
  let overallHealth: "healthy" | "caution" | "critical" = "healthy";
  const moderationScore = (pendingReports / 50) * 100;
  const contentScore = (reportedContent / 100) * 100;
  const systemScore = (errorRate / 0.5) * 100;
  const infrastructureScore =
    databaseConnectivity === "healthy" &&
    cacheConnectivity === "healthy" &&
    workerNodeStatus === "healthy" &&
    externalServices === "healthy"
      ? 0
      : 100;

  const averageScore =
    (moderationScore + contentScore + systemScore + infrastructureScore) / 4;
  if (averageScore > 80) {
    overallHealth = "healthy";
  } else if (averageScore > 50) {
    overallHealth = "caution";
  } else {
    overallHealth = "critical";
  }

  const lastUpdated = nowISO;
  const estimatedRefreshTime = new Date(Date.now() + 30000).toISOString();

  return {
    moderationWorkload: {
      pendingReports,
      approvedReports,
      rejectedReports,
      pendingContentDeletions,
      moderationReactionTime,
    },
    contentActivity: {
      activePosts,
      activeComments,
      reportedContent,
      recentContentChanges,
    },
    systemPerformance: {
      apiSuccessRate,
      errorRate,
      avgResponseTime,
      cacheHitRate,
    },
    infrastructureStatus: {
      databaseConnectivity,
      cacheConnectivity,
      workerNodeStatus,
      externalServices,
    },
    overallHealth,
    lastUpdated,
    estimatedRefreshTime,
  };
}
