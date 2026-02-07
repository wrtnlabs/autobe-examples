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

export async function deleteDiscussionBoardMemberArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string;
  commentId: string;
}): Promise<void> {
  // Find the comment and verify it belongs to the article
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
      deleted_at: null,
    },
  });
  // Verify comment exists
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Verify authorization: comment author or administrator
  const isAuthor = comment.discussion_board_member_id === props.member.id;
  if (!isAuthor) {
    // Check if member is an administrator (regular or super admin)
    const isAdmin = await MyGlobal.prisma.discussion_board_admins.findFirst({
      where: {
        id: props.member.id,
      },
    });
    const isSuperAdmin =
      await MyGlobal.prisma.discussion_board_super_admins.findFirst({
        where: {
          id: props.member.id,
        },
      });
    if (!isAdmin && !isSuperAdmin) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Perform soft delete
  await MyGlobal.prisma.discussion_board_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
