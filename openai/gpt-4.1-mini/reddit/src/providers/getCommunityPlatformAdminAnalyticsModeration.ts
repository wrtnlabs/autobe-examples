import { ICommunityPlatformAdminModerationAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminModerationAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminAnalyticsModeration(props: {
  admin: AdminPayload;
}): Promise<ICommunityPlatformAdminModerationAnalytic.ISummary> {
  // Aggregate counts of reports by status
  const reportsCounts =
    await MyGlobal.prisma.community_platform_reports.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    });
  // Aggregate counts of decisions by decision
  const decisionsCounts =
    await MyGlobal.prisma.community_platform_reports_decisions.groupBy({
      by: ["decision"],
      _count: {
        _all: true,
      },
    });
  // Fetch recent moderation logs
  const recentLogs =
    await MyGlobal.prisma.community_platform_moderation_logs.findMany({
      take: 20,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        moderator_id: true,
        action_type: true,
        created_at: true,
        post_id: true,
        comment_id: true,
        action_details: true,
      },
    });
  // Transform counts into summary objects
  const reportsSummary: Record<string, number> = {};
  for (const item of reportsCounts) {
    if (
      item.status !== null &&
      item._count &&
      typeof item._count._all === "number"
    ) {
      reportsSummary[String(item.status)] = item._count._all;
    }
  }
  const decisionsSummary: Record<string, number> = {};
  for (const item of decisionsCounts) {
    if (
      item.decision !== null &&
      item._count &&
      typeof item._count._all === "number"
    ) {
      decisionsSummary[String(item.decision)] = item._count._all;
    }
  }
  // Transform recentLogs to structured array
  const recentActivities = recentLogs.map((log) => {
    const id = log.id;
    const moderatorId = log.moderator_id;
    const moderatorDisplayName = null; // No relation, so can't obtain display name here
    const actionType = log.action_type;
    // We cannot use non-existent target_content_id, so use existing identifiers
    const targetContentId = log.post_id ?? log.comment_id ?? null;
    const actionTimestamp = toISOStringSafe(log.created_at);
    return {
      id,
      moderatorId,
      moderatorDisplayName,
      actionType,
      targetContentId,
      actionTimestamp,
    };
  });
  return {
    reportsSummary,
    decisionsSummary,
    recentActivities,
  };
}
