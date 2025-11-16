import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconPolDiscussionBoardMemberEconPolDiscussionBoardCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment =
    await MyGlobal.prisma.econ_pol_discussion_board_comments.findUnique({
      where: { id: props.commentId },
    });

  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }

  const isAdmin =
    (await MyGlobal.prisma.econ_pol_discussion_board_admins.findUnique({
      where: { id: props.member.id },
      select: { id: true },
    })) !== null;

  if (
    comment.econ_pol_discussion_board_member_id !== props.member.id &&
    !isAdmin
  ) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.econ_pol_discussion_board_comments.delete({
    where: { id: props.commentId },
  });
}
