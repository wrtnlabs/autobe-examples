import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function deleteDiscussionBoardMemberUserArticlesArticleIdCommentsCommentId(props: {
  memberUser: MemberuserPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Ensure the parent article exists.
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
    },
  });

  if (article === null) {
    throw new HttpException("Article not found", 404);
  }

  // 2. Find the comment scoped to the given article.
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
    },
  });

  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }

  // 3. Check ownership for member user.
  const memberOwnership =
    await MyGlobal.prisma.discussion_board_comment_of_memberusers.findFirst({
      where: {
        discussion_board_comment_id: props.commentId,
      },
    });

  if (memberOwnership !== null) {
    // There is a member ownership row; ensure it matches the authenticated member.
    if (
      memberOwnership.discussion_board_memberuser_id !== props.memberUser.id
    ) {
      throw new HttpException("Forbidden", 403);
    }
  } else {
    // No member ownership found; check if this is an admin-authored comment.
    const adminOwnership =
      await MyGlobal.prisma.discussion_board_comment_of_adminusers.findFirst({
        where: {
          discussion_board_comment_id: props.commentId,
        },
      });

    if (adminOwnership !== null) {
      // Comment is owned by an admin; member users cannot delete it.
      throw new HttpException("Forbidden", 403);
    }

    // If there is no ownership record at all, treat as forbidden for safety.
    throw new HttpException("Forbidden", 403);
  }

  // 4. Perform hard delete of the comment.
  await MyGlobal.prisma.discussion_board_comments.delete({
    where: {
      id: props.commentId,
    },
  });

  // Rely on DB-level cascading to clean up subtype ownership rows.
  return;
}
