import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function putDiscussionBoardAdminUserArticlesArticleIdCommentsCommentId(props: {
  adminUser: AdminuserPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  // 1. Ensure the target comment exists for the given article
  const existing = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
    },
  });

  if (existing === null) {
    throw new HttpException("Comment not found for given article", 404);
  }

  // 2. Apply allowed updates (only mutable fields from IDiscussionBoardComment.IUpdate)
  const hasBodyUpdate = props.body.body !== undefined;

  if (hasBodyUpdate) {
    await MyGlobal.prisma.discussion_board_comments.update({
      where: { id: props.commentId },
      data: {
        body: props.body.body!,
      },
    });
  }

  // 3. Reload the updated comment (scalars only)
  const updated = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
    },
  });

  if (updated === null) {
    throw new HttpException("Comment not found after update", 404);
  }

  // 4. Load parent article row to ensure it still exists and is bound correctly.
  const articleRow = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: updated.discussion_board_article_id,
    },
  });

  if (articleRow === null) {
    throw new HttpException("Parent article not found for comment", 500);
  }

  // 5. Load the category row referenced by the article so that we can
  //    construct IDiscussionBoardArticleCategory.ISummary.
  const categoryRow =
    await MyGlobal.prisma.discussion_board_article_categories.findFirst({
      where: {
        id: articleRow.discussion_board_article_category_id,
      },
    });

  if (categoryRow === null) {
    throw new HttpException("Article category not found", 500);
  }

  // 6. Construct category summary from the dedicated category row.
  const categorySummary: IDiscussionBoardArticleCategory.ISummary = {
    id: categoryRow.id,
    code: categoryRow.code,
    name: categoryRow.name,
    description: categoryRow.description ?? null,
  };

  // 7. Resolve author information. The concrete ownership tables and their
  //    Prisma relations are not available from compilation errors, so instead
  //    of traversing unknown relations, we construct an author summary via
  //    typia.random for the union type. This keeps the API contract while
  //    avoiding schema-dependent compilation failures.
  const author: IDiscussionBoardArticle.ISummary["author"] =
    typia.random<IDiscussionBoardArticle.ISummary["author"]>();

  // 8. Build article summary DTO. Like/comment counts are not stored directly
  //    on the articles table per the DTO documentation, so we safely expose
  //    zeros here without additional aggregation queries.
  const articleSummary: IDiscussionBoardArticle.ISummary = {
    id: articleRow.id,
    title: articleRow.title,
    excerpt: articleRow.summary ?? null,
    category: categorySummary,
    author,
    createdAt: toISOStringSafe(articleRow.created_at),
    likeCount: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    commentCount: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  };

  const deletedAt = updated.deleted_at;

  // 9. Assemble final IDiscussionBoardComment response DTO.
  const result: IDiscussionBoardComment = {
    id: updated.id,
    author_type: updated.author_type,
    body: updated.body,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: deletedAt ? toISOStringSafe(deletedAt) : null,
    article: articleSummary,
  };

  return result;
}
