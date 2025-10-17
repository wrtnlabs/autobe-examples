import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberTopicsTopicIdRepliesReplyId(props: {
  member: MemberPayload;
  topicId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, topicId, replyId } = props;

  const reply =
    await MyGlobal.prisma.discussion_board_replies.findUniqueOrThrow({
      where: { id: replyId },
      include: {
        topic: true,
        recursive: true,
      },
    });

  if (reply.discussion_board_topic_id !== topicId) {
    throw new HttpException("Reply does not belong to specified topic", 404);
  }

  if (reply.deleted_at !== null) {
    throw new HttpException("Reply already deleted", 400);
  }

  if (reply.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own replies",
      403,
    );
  }

  const oneHourInMs = 60 * 60 * 1000;
  const createdTime = new Date(reply.created_at).getTime();
  const currentTime = Date.now();

  if (currentTime - createdTime > oneHourInMs) {
    throw new HttpException(
      "Deletion time window expired: replies can only be deleted within 1 hour of posting",
      400,
    );
  }

  if (reply.topic.status === "locked") {
    throw new HttpException(
      "Topic is locked: cannot delete replies on locked topics",
      423,
    );
  }

  const hasChildReplies = reply.recursive.length > 0;
  const deletedAt = toISOStringSafe(new Date());

  if (hasChildReplies) {
    await MyGlobal.prisma.discussion_board_replies.update({
      where: { id: replyId },
      data: {
        content: "[deleted]",
        deleted_at: deletedAt,
        updated_at: deletedAt,
      },
    });
  } else {
    await MyGlobal.prisma.discussion_board_replies.update({
      where: { id: replyId },
      data: {
        deleted_at: deletedAt,
        updated_at: deletedAt,
      },
    });

    await MyGlobal.prisma.discussion_board_topics.update({
      where: { id: topicId },
      data: {
        reply_count: { decrement: 1 },
        updated_at: deletedAt,
      },
    });
  }
}
