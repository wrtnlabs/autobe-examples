import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminDashboardAppeal(props: {
  superAdmin: SuperadminPayload;
}): Promise<IDiscussionBoardBanAppeal> {
  // Get appeal statistics for the dashboard
  const totalAppeals = await MyGlobal.prisma.discussion_board_ban_appeals.count(
    {
      where: { deleted_at: null },
    },
  );
  const statusCounts =
    await MyGlobal.prisma.discussion_board_ban_appeals.groupBy({
      by: ["status"],
      where: { deleted_at: null },
      _count: { _all: true },
    });
  const processedAppeals =
    await MyGlobal.prisma.discussion_board_ban_appeals.findMany({
      where: {
        deleted_at: null,
        reviewed_at: { not: null },
      },
      select: {
        appealed_at: true,
        reviewed_at: true,
      },
    });
  // Calculate average processing time in hours
  let avgProcessingHours = 0;
  if (processedAppeals.length > 0) {
    const totalProcessingMs = processedAppeals.reduce((sum, appeal) => {
      const appealedTime = new Date(appeal.appealed_at).getTime();
      const reviewedTime = new Date(appeal.reviewed_at!).getTime();
      return sum + (reviewedTime - appealedTime);
    }, 0);
    avgProcessingHours =
      totalProcessingMs / (processedAppeals.length * 1000 * 60 * 60);
  }
  // Get the most recent appeal to use as a base for the dashboard response
  const recentAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.findFirst({
      where: { deleted_at: null },
      orderBy: { appealed_at: "desc" },
      include: {
        banRecord: true,
        user: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            created_at: true,
            updated_at: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
      },
    });
  const currentTime = toISOStringSafe(new Date());
  // If no appeals exist, return a default dashboard structure
  if (!recentAppeal) {
    return {
      id: v4(),
      appeal_reason:
        "Super Administrator Dashboard - No appeals currently in system",
      status: "dashboard",
      appealed_at: currentTime,
      banRecord: {
        id: v4(),
        ban_reason: "Dashboard statistics overview",
        ban_status: "active",
        ban_duration_days: null,
        expires_at: null,
        revoked_at: null,
        revoked_reason: null,
        created_at: currentTime,
        updated_at: currentTime,
      },
      user: {
        id: props.superAdmin.id,
        display_name: "Super Administrator",
        bio: "Dashboard overview for ban appeal management",
        created_at: currentTime,
        updated_at: currentTime,
      },
      decision_reason: `Dashboard Statistics: Total Appeals: 0`,
      reviewed_at: currentTime,
      reviewer: {
        id: props.superAdmin.id,
        email: "superadmin@system",
        display_name: "Super Administrator",
        created_at: currentTime,
      },
      created_at: currentTime,
      updated_at: currentTime,
      deleted_at: null,
    };
  }
  // Transform the status counts into a readable format
  const statusSummary = statusCounts
    .map((item) => `${item.status}: ${item._count._all}`)
    .join(", ");
  // Return the recent appeal enhanced with dashboard statistics
  return {
    id: recentAppeal.id,
    appeal_reason: recentAppeal.appeal_reason,
    status: recentAppeal.status,
    appealed_at: toISOStringSafe(recentAppeal.appealed_at),
    banRecord: {
      id: recentAppeal.banRecord.id,
      ban_reason: recentAppeal.banRecord.ban_reason,
      ban_status: recentAppeal.banRecord.ban_status,
      ban_duration_days: recentAppeal.banRecord.ban_duration_days,
      expires_at: recentAppeal.banRecord.expires_at
        ? toISOStringSafe(recentAppeal.banRecord.expires_at)
        : null,
      revoked_at: recentAppeal.banRecord.revoked_at
        ? toISOStringSafe(recentAppeal.banRecord.revoked_at)
        : null,
      revoked_reason: recentAppeal.banRecord.revoked_reason,
      created_at: toISOStringSafe(recentAppeal.banRecord.created_at),
      updated_at: toISOStringSafe(recentAppeal.banRecord.updated_at),
    },
    user: {
      id: recentAppeal.user.id,
      display_name: recentAppeal.user.display_name,
      bio: recentAppeal.user.bio,
      created_at: toISOStringSafe(recentAppeal.user.created_at),
      updated_at: toISOStringSafe(recentAppeal.user.updated_at),
    },
    decision_reason: `Dashboard Statistics: Total Appeals: ${totalAppeals}, Status Breakdown: ${statusSummary}, Avg Processing Time: ${avgProcessingHours.toFixed(1)} hours`,
    reviewed_at: recentAppeal.reviewed_at
      ? toISOStringSafe(recentAppeal.reviewed_at)
      : null,
    reviewer: recentAppeal.reviewer
      ? {
          id: recentAppeal.reviewer.id,
          email: recentAppeal.reviewer.email,
          display_name: recentAppeal.reviewer.display_name,
          created_at: toISOStringSafe(recentAppeal.reviewer.created_at),
        }
      : null,
    created_at: toISOStringSafe(recentAppeal.created_at),
    updated_at: toISOStringSafe(recentAppeal.updated_at),
    deleted_at: recentAppeal.deleted_at
      ? toISOStringSafe(recentAppeal.deleted_at)
      : null,
  };
}
