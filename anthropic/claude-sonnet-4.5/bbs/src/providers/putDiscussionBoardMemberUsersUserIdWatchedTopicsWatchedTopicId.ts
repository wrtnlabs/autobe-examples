import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardWatchedTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWatchedTopic";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberUsersUserIdWatchedTopicsWatchedTopicId(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  watchedTopicId: string & tags.Format<"uuid">;
  body: IDiscussionBoardWatchedTopic.IUpdate;
}): Promise<IDiscussionBoardWatchedTopic> {
  const { member, userId, watchedTopicId, body } = props;

  // Authorization: Verify userId matches authenticated member
  if (userId !== member.id) {
    throw new HttpException(
      "Unauthorized: Cannot update another user's watched topics",
      403,
    );
  }

  // Fetch existing watched topic with authorization check
  const existing =
    await MyGlobal.prisma.discussion_board_watched_topics.findUniqueOrThrow({
      where: { id: watchedTopicId },
    });

  // Authorization: Verify ownership
  if (existing.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own watched topic subscriptions",
      403,
    );
  }

  // Validate not soft-deleted
  if (existing.deleted_at !== null) {
    throw new HttpException(
      "Cannot update deleted watched topic subscription",
      400,
    );
  }

  // Update watched topic - Prisma auto-converts ISO strings to DateTime
  const updated = await MyGlobal.prisma.discussion_board_watched_topics.update({
    where: { id: watchedTopicId },
    data: {
      last_read_at:
        body.last_read_at !== undefined ? body.last_read_at : undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return with all dates converted to ISO strings
  return {
    id: updated.id,
    discussion_board_member_id: updated.discussion_board_member_id,
    discussion_board_topic_id: updated.discussion_board_topic_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    last_read_at: updated.last_read_at
      ? toISOStringSafe(updated.last_read_at)
      : null,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
