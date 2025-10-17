import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberUsersUserIdWatchedTopicsWatchedTopicId(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  watchedTopicId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, userId, watchedTopicId } = props;

  // CRITICAL AUTHORIZATION: Verify authenticated member matches userId
  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only manage your own watched topics",
      403,
    );
  }

  // Find the watched topic subscription
  const watchedTopic =
    await MyGlobal.prisma.discussion_board_watched_topics.findFirst({
      where: {
        id: watchedTopicId,
        deleted_at: null,
      },
    });

  if (!watchedTopic) {
    throw new HttpException("Watched topic subscription not found", 404);
  }

  // OWNERSHIP VALIDATION: Verify subscription belongs to authenticated user
  if (watchedTopic.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only unwatch your own topic subscriptions",
      403,
    );
  }

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_watched_topics.update({
    where: { id: watchedTopicId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
