import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberDiscussionBoardCommentsId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.id },
    include: { author: true },
  });

  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }

  if (comment.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const now = new Date();
  const nowString = toISOStringSafe(now);

  const updated = await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.id },
    data: {
      content: props.body.content,
      updated_at: now,
    },
    include: { author: true },
  });

  return {
    id: updated.id,
    content: updated.content,
    discussion_board_article_id: updated.discussion_board_article_id,
    author: {
      id: updated.author.id,
      email: updated.author.email,
      nickname: updated.author.nickname,
    },
    created_at: toISOStringSafe(updated.created_at),
    updated_at: nowString,
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
