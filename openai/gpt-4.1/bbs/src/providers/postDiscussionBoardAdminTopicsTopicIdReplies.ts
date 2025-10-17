import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postDiscussionBoardAdminTopicsTopicIdReplies(props: {
  admin: AdminPayload;
  topicId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReply.ICreate;
}): Promise<IDiscussionBoardReply> {
  const topic = await MyGlobal.prisma.discussion_board_topics.findUnique({
    where: { id: props.topicId },
  });
  if (!topic) {
    throw new HttpException("Topic not found", 404);
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const replyId: string & tags.Format<"uuid"> = v4();

  const created = await MyGlobal.prisma.discussion_board_replies.create({
    data: {
      id: replyId,
      topic_id: props.topicId,
      author_admin_id: props.admin.id,
      author_member_id: null,
      content: props.body.content,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    topic_id: created.topic_id,
    author_member_id: created.author_member_id,
    author_admin_id: created.author_admin_id,
    content: created.content,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
