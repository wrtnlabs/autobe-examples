import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberDiscussionBoardCommentsId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.id },
    select: { discussion_board_member_id: true },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  if (comment.discussion_board_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: You are not the author of this comment",
      403,
    );
  }

  await MyGlobal.prisma.discussion_board_comments.delete({
    where: { id: props.id },
  });
}
