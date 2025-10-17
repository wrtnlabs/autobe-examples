import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberTopicsTopicIdReplies(props: {
  member: MemberPayload;
  topicId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReply.ICreate;
}): Promise<IDiscussionBoardReply> {
  // Step 1: Check the referenced topic exists
  const topic = await MyGlobal.prisma.discussion_board_topics.findUnique({
    where: { id: props.topicId },
  });
  if (!topic) {
    throw new HttpException("Topic does not exist", 404);
  }

  // Step 2: Prepare reply fields
  const now = toISOStringSafe(new Date());
  const replyId = v4() as string & tags.Format<"uuid">;

  // Step 3: Create reply
  const created = await MyGlobal.prisma.discussion_board_replies.create({
    data: {
      id: replyId,
      topic_id: props.topicId,
      author_member_id: props.member.id,
      author_admin_id: null,
      content: props.body.content,
      created_at: now,
      updated_at: now,
    },
  });

  // Step 4: Respond with DTO-compliant object
  return {
    id: created.id,
    topic_id: created.topic_id,
    author_member_id: created.author_member_id ?? undefined,
    author_admin_id: undefined,
    content: created.content,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
