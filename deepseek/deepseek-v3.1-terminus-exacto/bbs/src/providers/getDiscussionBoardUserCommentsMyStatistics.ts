import { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserCommentsMyStatistics(props: {
  user: UserPayload;
}): Promise<IDiscussionBoardArticleViewStatEvent> {
  // Verify user exists
  const userRecord = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
  });
  if (!userRecord) {
    throw new HttpException("User not found", 404);
  }
  // Get comment statistics
  const comments = await MyGlobal.prisma.discussion_board_comments.findMany({
    where: {
      discussion_board_user_id: props.user.id,
      deleted_at: null,
    },
    select: {
      content: true,
      created_at: true,
    },
  });
  // Calculate statistics
  const totalComments = comments.length;
  const avgLength =
    comments.length > 0
      ? comments.reduce((sum, comment) => sum + comment.content.length, 0) /
        comments.length
      : 0;
  const latestComment =
    comments.length > 0
      ? new Date(
          Math.max(...comments.map((c) => new Date(c.created_at).getTime())),
        )
      : null;
  const now = new Date();
  return {
    id: v4(),
    total_view_count: totalComments,
    unique_viewer_count: 0,
    last_viewed_at: latestComment ? toISOStringSafe(latestComment) : null,
    average_time_spent_seconds: Math.round(avgLength),
    total_time_spent_seconds: 0,
    created_at: toISOStringSafe(now),
    updated_at: toISOStringSafe(now),
  };
}
