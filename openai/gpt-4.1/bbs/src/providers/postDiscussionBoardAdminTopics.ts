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

export async function postDiscussionBoardAdminTopics(props: {
  admin: AdminPayload;
  body: IDiscussionBoardTopic.ICreate;
}): Promise<IDiscussionBoardTopic> {
  // Rate limiting: max 5 topics per admin per hour.
  const now = toISOStringSafe(new Date());
  const oneHourAgo = toISOStringSafe(new Date(Date.now() - 60 * 60 * 1000));
  const topicsCreated = await MyGlobal.prisma.discussion_board_topics.count({
    where: {
      author_admin_id: props.admin.id,
      created_at: { gte: oneHourAgo },
    },
  });
  if (topicsCreated >= 5) {
    throw new HttpException(
      "Rate limit exceeded: Up to 5 topics per admin per hour.",
      429,
    );
  }

  const created = await MyGlobal.prisma.discussion_board_topics.create({
    data: {
      id: v4(),
      author_member_id: null,
      author_admin_id: props.admin.id,
      subject: props.body.subject,
      content: props.body.content,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    author_member_id: null,
    author_admin_id: created.author_admin_id,
    subject: created.subject,
    content: created.content,
    created_at: now,
    updated_at: now,
  };
}
