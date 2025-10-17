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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminTopicsTopicId(props: {
  admin: AdminPayload;
  topicId: string & tags.Format<"uuid">;
  body: IDiscussionBoardTopic.IUpdate;
}): Promise<IDiscussionBoardTopic> {
  // Find the topic (404 if not found)
  const topic = await MyGlobal.prisma.discussion_board_topics.findUnique({
    where: { id: props.topicId },
  });
  if (!topic) {
    throw new HttpException("Topic not found", 404);
  }
  // Authorization: Only allow update if admin is author_admin_id or any admin (admin endpoint)
  // By spec, any authenticated admin can update.

  // Prepare update fields
  const now = toISOStringSafe(new Date());
  const updateInput = {
    subject: props.body.subject !== undefined ? props.body.subject : undefined,
    content: props.body.content !== undefined ? props.body.content : undefined,
    updated_at: now,
  };
  const updated = await MyGlobal.prisma.discussion_board_topics.update({
    where: { id: props.topicId },
    data: updateInput,
  });
  // Return updated topic mapped as IDiscussionBoardTopic (no replies included)
  return {
    id: updated.id,
    author_member_id: updated.author_member_id ?? undefined,
    author_admin_id: updated.author_admin_id ?? undefined,
    subject: updated.subject,
    content: updated.content,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
