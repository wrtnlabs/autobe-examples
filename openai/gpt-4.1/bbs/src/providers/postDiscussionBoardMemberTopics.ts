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

export async function postDiscussionBoardMemberTopics(props: {
  member: MemberPayload;
  body: IDiscussionBoardTopic.ICreate;
}): Promise<IDiscussionBoardTopic> {
  // Duplicate prevention: Does this member already have a topic with same subject?
  const duplicate = await MyGlobal.prisma.discussion_board_topics.findFirst({
    where: {
      author_member_id: props.member.id,
      subject: props.body.subject,
    },
  });
  if (duplicate) {
    throw new HttpException(
      "Duplicate topic: You have already posted a topic with this subject.",
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.discussion_board_topics.create({
    data: {
      id: v4(),
      author_member_id: props.member.id,
      author_admin_id: null,
      subject: props.body.subject,
      content: props.body.content,
      created_at: now,
      updated_at: now,
    },
  });
  return {
    id: created.id,
    author_member_id: created.author_member_id ?? undefined,
    author_admin_id: created.author_admin_id ?? undefined,
    subject: created.subject,
    content: created.content,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    discussion_board_replies: undefined,
  };
}
