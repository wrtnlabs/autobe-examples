import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditLikeAdminModeratorsModeratorIdActivity(props: {
  admin: AdminPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeModerator.IActivity> {
  const { moderatorId } = props;

  const activityStats =
    await MyGlobal.prisma.mv_reddit_like_moderator_activity_stats.findUnique({
      where: {
        moderator_id: moderatorId,
      },
    });

  if (!activityStats) {
    return {
      total_actions: 0,
      total_reports_reviewed: 0,
      total_content_removals: 0,
      total_bans_issued: 0,
    };
  }

  const totalActions =
    activityStats.total_reports_reviewed +
    activityStats.total_content_removals +
    activityStats.total_bans_issued +
    activityStats.total_appeals_reviewed;

  return {
    total_actions: Number(totalActions),
    total_reports_reviewed: Number(activityStats.total_reports_reviewed),
    total_content_removals: Number(activityStats.total_content_removals),
    total_bans_issued: Number(activityStats.total_bans_issued),
  };
}
