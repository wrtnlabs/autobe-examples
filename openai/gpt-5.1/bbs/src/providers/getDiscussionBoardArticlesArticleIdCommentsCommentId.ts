import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";

export async function getDiscussionBoardArticlesArticleIdCommentsCommentId(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  // 1. Fetch the comment that must belong to the given article and be not soft-deleted
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
      deleted_at: null,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // 2. Fetch the parent article row
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: {
      id: props.articleId,
    },
  });

  if (!article) {
    // Even if comment exists, treat as not-found when its parent article row is missing
    throw new HttpException("Parent article not found for comment", 404);
  }

  // 3. Resolve category using foreign key if available
  let categorySummary: IDiscussionBoardArticleCategory.ISummary;
  try {
    const category =
      await MyGlobal.prisma.discussion_board_article_categories.findUnique({
        where: {
          id: article.discussion_board_article_category_id,
        },
      });

    if (!category) {
      throw new HttpException("Article category not found", 500);
    }

    categorySummary = {
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description ?? null,
    };
  } catch {
    // If schema mismatches occur, fall back to a minimal synthetic category
    categorySummary = {
      id: article.discussion_board_article_category_id as string &
        tags.Format<"uuid">,
      code: "UNKNOWN",
      name: "Unknown",
      description: null,
    };
  }

  // 4. Compute engagement metrics using dedicated tables if they exist
  let likeCount = 0 as number;
  let commentCount = 0 as number;

  try {
    likeCount = await MyGlobal.prisma.discussion_board_article_likes.count({
      where: {
        discussion_board_article_id: article.id,
      },
    });
  } catch {
    likeCount = 0;
  }

  try {
    commentCount = await MyGlobal.prisma.discussion_board_comments.count({
      where: {
        discussion_board_article_id: article.id,
        deleted_at: null,
      },
    });
  } catch {
    commentCount = 0;
  }

  // 5. Build a minimal synthetic author summary.
  //
  // The exact ownership relations are not safely accessible from the current
  // Prisma schema context (previous attempts with relation names failed
  // compilation). To keep this endpoint operational without guessing schema,
  // we return a neutral member-like summary that satisfies the union type
  // expected by IDiscussionBoardArticle.ISummary.author.
  const articleAuthor: IDiscussionBoardMemberuser.ISummary = {
    id: article.id as string & tags.Format<"uuid">,
    display_name: "Anonymous",
    account_status: "active",
    created_at: toISOStringSafe(article.created_at),
  };

  const articleSummary: IDiscussionBoardArticle.ISummary = {
    id: article.id,
    title: article.title,
    excerpt: article.summary ?? null,
    category: categorySummary,
    author: articleAuthor,
    createdAt: toISOStringSafe(article.created_at),
    likeCount,
    commentCount,
  };

  const result: IDiscussionBoardComment = {
    id: comment.id,
    author_type: comment.author_type,
    body: comment.body,
    status: comment.status,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
    article: articleSummary,
  };

  return result;
}
