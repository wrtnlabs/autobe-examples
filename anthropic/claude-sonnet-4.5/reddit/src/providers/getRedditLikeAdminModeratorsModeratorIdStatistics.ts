import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModeratorActivityStats } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorActivityStats";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditLikeAdminModeratorsModeratorIdStatistics(props: {
  admin: AdminPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeModeratorActivityStats> {
  const { moderatorId } = props;

  const stats =
    await MyGlobal.prisma.mv_reddit_like_moderator_activity_stats.findUniqueOrThrow(
      {
        where: {
          moderator_id: moderatorId,
        },
      },
    );

  return {
    id: stats.id,
    moderator_id: stats.moderator_id,
    total_reports_reviewed: stats.total_reports_reviewed,
    total_content_removals: stats.total_content_removals,
    total_bans_issued: stats.total_bans_issued,
    total_appeals_reviewed: stats.total_appeals_reviewed,
    average_report_response_hours:
      stats.average_report_response_hours ?? undefined,
    last_activity_at: stats.last_activity_at
      ? toISOStringSafe(stats.last_activity_at)
      : undefined,
    last_calculated_at: toISOStringSafe(stats.last_calculated_at),
  };
}
