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

export async function getDiscussionBoardArticlesArticleIdCommentsCommentId(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: {
      id: props.commentId,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException("Comment not found", 404);
  }

  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: {
      id: comment.discussion_board_member_id,
    },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: {
      id: comment.discussion_board_article_id,
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  const articleAuthor =
    await MyGlobal.prisma.discussion_board_members.findUnique({
      where: {
        id: article.discussion_board_member_id,
      },
    });

  if (!articleAuthor) {
    throw new HttpException("Article author not found", 404);
  }

  return {
    id: comment.id as string & tags.Format<"uuid">,
    discussion_board_article_id: comment.discussion_board_article_id as string &
      tags.Format<"uuid">,
    member_id: comment.discussion_board_member_id as string &
      tags.Format<"uuid">,
    content: comment.content as string & tags.MaxLength<2000>,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
    member: {
      id: member.id as string & tags.Format<"uuid">,
      username: member.username,
      email: member.email as string & tags.Format<"email">,
      status: member.status,
      email_verified: member.email_verified,
      created_at: toISOStringSafe(member.created_at),
    },
    article: {
      id: article.id as string & tags.Format<"uuid">,
      title: article.title,
      view_count: article.view_count as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      author: {
        id: articleAuthor.id as string & tags.Format<"uuid">,
        username: articleAuthor.username,
        email: articleAuthor.email as string & tags.Format<"email">,
        status: articleAuthor.status,
        email_verified: articleAuthor.email_verified,
        created_at: toISOStringSafe(articleAuthor.created_at),
      },
    },
  };
}
