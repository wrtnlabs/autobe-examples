import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneOwnerAnalyticsResolutionRates(props: {
  owner: OwnerPayload;
}): Promise<IRedditCloneContentPost.IResolutionRate> {
  // Get communities where this owner has privileges
  const ownedCommunities =
    await MyGlobal.prisma.reddit_clone_community_owners.findMany({
      where: {
        reddit_clone_owner_id: props.owner.id,
      },
      select: {
        reddit_clone_community_id: true,
      },
    });
  const moderatorCommunities =
    await MyGlobal.prisma.reddit_clone_community_moderators.findMany({
      where: {
        moderator_id: props.owner.id,
      },
      select: {
        community_id: true,
      },
    });
  const communityIds = Array.from(
    new Set([
      ...ownedCommunities.map((c) => c.reddit_clone_community_id),
      ...moderatorCommunities.map((c) => c.community_id),
    ]),
  );
  // Get all reports for these communities
  const reports = await MyGlobal.prisma.reddit_clone_reports.findMany({
    where: {
      content: {
        community_id: { in: communityIds },
      },
    },
    select: {
      id: true,
      created_at: true,
      resolved_at: true,
      status: true,
    },
  });
  // Get all resolved reports
  const resolvedReports =
    await MyGlobal.prisma.reddit_clone_content_report_resolutions.findMany({
      where: {
        report_id: {
          in: reports.map((r) => r.id),
        },
      },
      select: {
        id: true,
        report_id: true,
        action: true,
        resolved_at: true,
      },
    });
  const totalReports = reports.length;
  const resolvedCount = resolvedReports.length;
  const pendingReports = totalReports - resolvedCount;
  const approvedCount = resolvedReports.filter(
    (r) => r.action === "approve",
  ).length;
  const dismissedCount = resolvedReports.filter(
    (r) => r.action === "dismiss",
  ).length;
  const totalResolved = approvedCount + dismissedCount;
  const approvalRate =
    totalResolved > 0 ? (approvedCount / totalResolved) * 100 : 0;
  const dismissalRate =
    totalResolved > 0 ? (dismissedCount / totalResolved) * 100 : 0;
  // Calculate average resolution time in minutes
  let averageResolutionTimeMinutes = 0;
  if (resolvedReports.length > 0) {
    const reportIds = new Set(resolvedReports.map((r) => r.report_id));
    const relatedReports = reports.filter((r) => reportIds.has(r.id));
    const timeDifferences = resolvedReports
      .map((r) => {
        const resolvedDate = new Date(r.resolved_at);
        const relatedReport = relatedReports.find(
          (rp) => rp.id === r.report_id,
        );
        if (relatedReport) {
          const createdDate = new Date(relatedReport.created_at);
          return resolvedDate.getTime() - createdDate.getTime();
        }
        return 0;
      })
      .filter((t) => t > 0);
    if (timeDifferences.length > 0) {
      averageResolutionTimeMinutes =
        timeDifferences.reduce((acc, t) => acc + t, 0) /
        timeDifferences.length /
        60000;
    }
  }
  const calculatedAt = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  return {
    totalReports,
    resolvedReports: resolvedCount,
    pendingReports,
    approvalRate,
    dismissalRate,
    averageResolutionTimeMinutes,
    calculatedAt,
  };
}
