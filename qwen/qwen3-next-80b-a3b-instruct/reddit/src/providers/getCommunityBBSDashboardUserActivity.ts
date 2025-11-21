import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSUserActivitySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSUserActivitySummary";

export async function getCommunityBBSDashboardUserActivity(): Promise<ICommunityBBSUserActivitySummary> {
  const activity =
    await MyGlobal.prisma.community_bbs_user_activity_summary.findUnique({
      where: {
        citizen_id: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
      },
    });

  if (!activity) {
    throw new HttpException("User activity summary not found", 404);
  }

  return {
    citizenId: activity.citizen_id,
    postCount: activity.post_count,
    commentCount: activity.comment_count,
    replyCount: activity.reply_count,
    upvoteCount: activity.upvote_count,
    downvoteCount: activity.downvote_count,
    reportCount: activity.report_count,
    reportApprovedCount: activity.report_approved_count,
    mostActiveCommunityId:
      activity.most_active_community_id === null
        ? undefined
        : (activity.most_active_community_id satisfies string as string),
    lastPostAt:
      activity.last_post_at === null
        ? undefined
        : toISOStringSafe(activity.last_post_at),
    lastCommentAt:
      activity.last_comment_at === null
        ? undefined
        : toISOStringSafe(activity.last_comment_at),
    createdAt: toISOStringSafe(activity.created_at),
    updatedAt: toISOStringSafe(activity.updated_at),
    nextUpdateAt: toISOStringSafe(
      new Date(
        Math.max(
          activity.updated_at.getTime(),
          new Date().getTime() - 300000, // Ensure it's in future, 5-minute buffer
        ) + 900000,
      ),
    ), // 15 minutes
  };
}
