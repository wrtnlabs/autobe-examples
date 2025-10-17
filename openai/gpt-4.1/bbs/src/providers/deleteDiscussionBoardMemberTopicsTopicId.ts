import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberTopicsTopicId(props: {
  member: MemberPayload;
  topicId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch the topic or throw 404 if not found
  const topic = await MyGlobal.prisma.discussion_board_topics.findUnique({
    where: { id: props.topicId },
    select: {
      id: true,
      author_member_id: true,
    },
  });
  if (!topic) {
    throw new HttpException("Topic not found", 404);
  }

  // 2. Check if the requesting member is the topic author
  if (topic.author_member_id !== props.member.id) {
    throw new HttpException("You are not authorized to delete this topic", 403);
  }
  // 3. Delete the topic (hard delete)
  await MyGlobal.prisma.discussion_board_topics.delete({
    where: { id: props.topicId },
  });
}
