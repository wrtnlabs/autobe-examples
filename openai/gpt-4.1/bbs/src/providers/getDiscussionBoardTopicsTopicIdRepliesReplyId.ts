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
      topic_id: topicId,
    },
  });
  if (!reply) {
    throw new HttpException("Reply not found for the specified topic", 404);
  }
  return {
    id: reply.id,
    topic_id: reply.topic_id,
    author_member_id:
      reply.author_member_id === null ? undefined : reply.author_member_id,
    author_admin_id:
      reply.author_admin_id === null ? undefined : reply.author_admin_id,
    content: reply.content,
    created_at: toISOStringSafe(reply.created_at),
    updated_at: toISOStringSafe(reply.updated_at),
  };
}
