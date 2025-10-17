import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";

export async function getDiscussionBoardTopicsTopicId(props: {
  topicId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardTopic> {
  // Fetch topic by id
  const topic = await MyGlobal.prisma.discussion_board_topics.findUnique({
    where: { id: props.topicId },
  });
  if (!topic) {
    throw new HttpException("Topic not found", 404);
  }

  // Fetch replies in ascending chronological order
  const replies = await MyGlobal.prisma.discussion_board_replies.findMany({
    where: { topic_id: props.topicId },
    orderBy: { created_at: "asc" },
  });

  return {
    id: topic.id,
    author_member_id: topic.author_member_id ?? undefined,
    author_admin_id: topic.author_admin_id ?? undefined,
    subject: topic.subject,
    content: topic.content,
    created_at: toISOStringSafe(topic.created_at),
    updated_at: toISOStringSafe(topic.updated_at),
    discussion_board_replies: replies.map((reply) => ({
      id: reply.id,
      topic_id: reply.topic_id,
      author_member_id: reply.author_member_id ?? undefined,
      author_admin_id: reply.author_admin_id ?? undefined,
      content: reply.content,
      created_at: toISOStringSafe(reply.created_at),
      updated_at: toISOStringSafe(reply.updated_at),
    })),
  };
}
