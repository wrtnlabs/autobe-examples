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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteDiscussionBoardMemberArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch the comment by commentId
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        discussion_board_article_id: true,
        discussion_board_member_id: true,
        deleted_at: true,
      },
    });
  // 2. Check if comment is already deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment already deleted", 409);
  }
  // 3. Verify article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // 4. Verify articleId matches comment's discussion_board_article_id
  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      400,
    );
  }
  // 5. Check if member is banned
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: {
        ban_status: true,
      },
    });
  if (member.ban_status === "banned") {
    throw new HttpException("Banned users cannot delete comments", 403);
  }
  // 6. Check authorization - member must be the comment author
  if (comment.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 7. Soft delete by setting deleted_at
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: new Date(),
    },
  });
}
