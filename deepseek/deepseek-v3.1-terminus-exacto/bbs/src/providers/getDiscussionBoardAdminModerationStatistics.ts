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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminModerationStatistics(props: {
  admin: AdminPayload;
}): Promise<IDiscussionBoardContentModerationLog> {
  // Verify administrator access
  await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
  });
  // Get current timestamp as ISO string
  const currentTimestamp = toISOStringSafe(new Date());
  const thirtyDaysAgo = toISOStringSafe(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );
  try {
    // Execute aggregation queries
    const [moderationLogsCount, recentActionTrend] = await Promise.all([
      // Total moderation logs count
      MyGlobal.prisma.discussion_board_content_moderation_logs.count({
        where: {},
      }),
      // Recent action trend (last 30 days)
      MyGlobal.prisma.discussion_board_content_moderation_logs.findMany({
        where: {
          created_at: { gte: thirtyDaysAgo },
        },
        select: { action_type: true, created_at: true },
      }),
    ]);
    // Generate UUIDs for the response structure
    const logId = v4();
    // Get current admin details for the response
    const currentAdmin =
      await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
        where: { id: props.admin.id },
        select: {
          id: true,
          email: true,
          display_name: true,
          created_at: true,
        },
      });
    // Transform to the required API response format
    return {
      id: logId,
      action_type: "statistics_aggregation",
      target_content_type: "system_metrics",
      target_content_id: logId,
      reason: `Generated moderation statistics at ${currentTimestamp}`,
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
      admin: {
        id: currentAdmin.id,
        email: currentAdmin.email,
        display_name: currentAdmin.display_name,
        created_at: toISOStringSafe(currentAdmin.created_at),
      },
    };
  } catch (error) {
    // Handle aggregation errors gracefully
    throw new HttpException(
      `Failed to generate moderation statistics: ${error instanceof Error ? error.message : "Unknown error"}`,
      500,
    );
  }
}
