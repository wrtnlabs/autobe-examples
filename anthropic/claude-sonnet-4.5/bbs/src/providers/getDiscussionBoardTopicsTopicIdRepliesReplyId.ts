import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";

export async function getDiscussionBoardTopicsTopicIdRepliesReplyId(props: {
  topicId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardReply> {
  const { topicId, replyId } = props;

  const reply = await MyGlobal.prisma.discussion_board_replies.findFirst({
    where: {
      id: replyId,
      discussion_board_topic_id: topicId,
      deleted_at: null,
    },
  });

  if (!reply) {
    throw new HttpException(
      "Reply not found or does not belong to the specified topic",
      404,
    );
  }

  return {
    id: reply.id,
    discussion_board_topic_id: reply.discussion_board_topic_id,
    discussion_board_member_id: reply.discussion_board_member_id,
    parent_reply_id:
      reply.parent_reply_id === null ? undefined : reply.parent_reply_id,
    content: reply.content,
    depth_level: reply.depth_level,
    created_at: toISOStringSafe(reply.created_at),
    updated_at: toISOStringSafe(reply.updated_at),
  };
}
