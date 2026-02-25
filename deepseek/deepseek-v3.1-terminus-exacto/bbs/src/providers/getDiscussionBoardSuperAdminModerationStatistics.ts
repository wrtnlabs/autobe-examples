import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardContentModerationLogTransformer } from "../transformers/DiscussionBoardContentModerationLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminModerationStatistics(props: {
  superAdmin: SuperAdminPayload;
}): Promise<IDiscussionBoardContentModerationLog> {
  // Verify the super admin exists
  const superAdmin =
    await MyGlobal.prisma.discussion_board_super_admins.findFirst({
      where: {
        id: props.superAdmin.id,
        deleted_at: null,
      },
    });
  if (!superAdmin) {
    throw new HttpException("Super administrator not found", 404);
  }
  // Calculate timeframe boundaries
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // Prepare comprehensive statistics by aggregating from multiple tables
  // 1. Moderation action statistics (last 30 days)
  const actionCounts =
    await MyGlobal.prisma.discussion_board_moderation_logs.groupBy({
      by: ["action_type"],
      where: {
        deleted_at: null,
        created_at: { gte: thirtyDaysAgo },
      },
      _count: { action_type: true },
    });
  // 2. Ban statistics by status
  const banStats = await MyGlobal.prisma.discussion_board_ban_records.groupBy({
    by: ["ban_status"],
    _count: { ban_status: true },
  });
  // 3. Queue backlog statistics
  const queueStats =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.groupBy({
      by: ["moderation_status", "priority_level"],
      where: { resolved_at: null },
      _count: { moderation_status: true },
    });
  // 4. Timeframe-based counts for trend analysis
  const recentActions =
    await MyGlobal.prisma.discussion_board_moderation_logs.count({
      where: {
        deleted_at: null,
        created_at: { gte: sevenDaysAgo },
      },
    });
  const todayActions =
    await MyGlobal.prisma.discussion_board_moderation_logs.count({
      where: {
        deleted_at: null,
        created_at: { gte: twentyFourHoursAgo },
      },
    });
  // 5. Administrator performance (last 7 days)
  const adminStats =
    await MyGlobal.prisma.discussion_board_moderation_logs.groupBy({
      by: ["admin_id"],
      where: {
        deleted_at: null,
        created_at: { gte: sevenDaysAgo },
        admin_id: { not: null },
      },
      _count: { admin_id: true },
    });
  // 6. Get super admin info for audit trail
  const adminDisplayInfo =
    await MyGlobal.prisma.discussion_board_admins.findFirst({
      where: {
        id: props.superAdmin.id,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        display_name: true,
      },
    });
  // Prepare comprehensive statistics data
  const statisticsData = {
    action_counts: Object.fromEntries(
      actionCounts.map((item) => [item.action_type, item._count.action_type]),
    ),
    ban_statistics: Object.fromEntries(
      banStats.map((item) => [item.ban_status, item._count.ban_status]),
    ),
    queue_backlog: Object.fromEntries(
      queueStats.map((item) => [
        `${item.moderation_status}_${item.priority_level}`,
        item._count.moderation_status,
      ]),
    ),
    timeframe_counts: {
      last_24_hours: todayActions,
      last_7_days: recentActions,
    },
    administrator_counts: adminStats
      .filter((item) => item.admin_id)
      .map((item) => ({
        admin_id: item.admin_id,
        action_count: item._count.admin_id,
      })),
    generated_at: now.toISOString(),
  };
  // Get the latest content moderation log entry for template
  const latestLog =
    await MyGlobal.prisma.discussion_board_content_moderation_logs.findFirst({
      orderBy: { created_at: "desc" },
      include: { admin: true },
    });
  if (latestLog) {
    // Transform and return the latest log with statistics
    const transformed =
      await DiscussionBoardContentModerationLogTransformer.transform(latestLog);
    return {
      ...transformed,
      reason: JSON.stringify({
        statistics_summary: statisticsData,
        original_reason: transformed.reason,
      }),
    };
  }
  // Create new statistics log entry if no existing logs
  const statisticsLogId = v4();
  const nowISO = now.toISOString();
  return {
    id: statisticsLogId as string & tags.Format<"uuid">,
    action_type: "system_statistics_report",
    target_content_type: "moderation_dashboard",
    target_content_id: props.superAdmin.id as string & tags.Format<"uuid">,
    reason: JSON.stringify(statisticsData),
    created_at: nowISO as string & tags.Format<"date-time">,
    updated_at: nowISO as string & tags.Format<"date-time">,
    admin: {
      id: props.superAdmin.id as string & tags.Format<"uuid">,
      email:
        adminDisplayInfo?.email ||
        (superAdmin.email as string & tags.Format<"email">),
      display_name:
        adminDisplayInfo?.display_name ||
        `Super Admin ${superAdmin.id.slice(0, 8)}`,
      created_at: superAdmin.created_at.toISOString() as string &
        tags.Format<"date-time">,
    } satisfies IDiscussionBoardAdmin.ISummary,
  };
}
