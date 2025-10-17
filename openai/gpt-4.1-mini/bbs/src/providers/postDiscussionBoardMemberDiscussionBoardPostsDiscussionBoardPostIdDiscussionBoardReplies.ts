import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardReply";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberDiscussionBoardPostsDiscussionBoardPostIdDiscussionBoardReplies(props: {
  member: MemberPayload;
  discussionBoardPostId: string & tags.Format<"uuid">;
  body: IDiscussionBoardDiscussionBoardReply.ICreate;
}): Promise<IDiscussionBoardDiscussionBoardReply> {
  const { member, discussionBoardPostId, body } = props;

  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: discussionBoardPostId },
    select: { id: true },
  });
  if (post === null) {
    throw new HttpException("Discussion board post not found", 404);
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as unknown as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.discussion_board_replies.create({
    data: {
      id,
      post_id: discussionBoardPostId,
      member_id: member.id,
      content: body.content,
      reply_status: body.reply_status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    post_id: created.post_id,
    member_id: created.member_id,
    content: created.content,
    reply_status: created.reply_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null || created.deleted_at === undefined
        ? created.deleted_at
        : toISOStringSafe(created.deleted_at),
  };
}
