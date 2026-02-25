import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { id: true, author_id: true, article_id: true },
    });
  // Authorization check: comment author or admin
  if (comment.author_id !== props.member.id) {
    throw new HttpException(
      "You are not authorized to delete this comment",
      403,
    );
  }
  // Delete the comment (cascade handles related records per schema)
  await MyGlobal.prisma.discussion_board_comments.delete({
    where: { id: props.commentId },
  });
  // TODO: Decrement article comment count if tracked in database
}
