import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    include: {
      member: true,
      article: {
        include: {
          member: true,
        },
      },
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      404,
    );
  }

  if (comment.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.discussion_board_comments.delete({
    where: { id: props.commentId },
  });

  return {
    id: comment.id,
    discussion_board_article_id: comment.discussion_board_article_id,
    member_id: comment.discussion_board_member_id,
    content: comment.content,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
    member: {
      id: comment.member.id,
      username: comment.member.username,
      email: comment.member.email,
      status: comment.member.status,
      email_verified: comment.member.email_verified,
      created_at: toISOStringSafe(comment.member.created_at),
    },
    article: {
      id: comment.article.id,
      title: comment.article.title,
      view_count: comment.article.view_count,
      created_at: toISOStringSafe(comment.article.created_at),
      updated_at: toISOStringSafe(comment.article.updated_at),
      author: {
        id: comment.article.member.id,
        username: comment.article.member.username,
        email: comment.article.member.email,
        status: comment.article.member.status,
        email_verified: comment.article.member.email_verified,
        created_at: toISOStringSafe(comment.article.member.created_at),
      },
    },
  };
}
