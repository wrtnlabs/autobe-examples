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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberTopicsTopicId(props: {
  member: MemberPayload;
  topicId: string & tags.Format<"uuid">;
  body: IDiscussionBoardTopic.IUpdate;
}): Promise<IDiscussionBoardTopic> {
  // 1. Fetch topic & verify author ownership
  const topic = await MyGlobal.prisma.discussion_board_topics.findUnique({
    where: { id: props.topicId },
  });
  if (!topic || topic.author_member_id !== props.member.id) {
    throw new HttpException("You are not allowed to edit this topic.", 403);
  }

  // 2. Prepare updated_at value (must be ISO string & tags.Format<'date-time'>)
  const now = toISOStringSafe(new Date());

  // 3. Update topic. Only update fields from body if supplied + updated_at
  const updated = await MyGlobal.prisma.discussion_board_topics.update({
    where: { id: props.topicId },
    data: {
      ...(props.body.subject !== undefined
        ? { subject: props.body.subject }
        : {}),
      ...(props.body.content !== undefined
        ? { content: props.body.content }
        : {}),
      updated_at: now,
    },
  });

  // 4. Return result, mapping DB fields to DTO fields. No reply array included.
  return {
    id: updated.id,
    author_member_id: updated.author_member_id ?? undefined,
    author_admin_id: updated.author_admin_id ?? undefined,
    subject: updated.subject,
    content: updated.content,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
