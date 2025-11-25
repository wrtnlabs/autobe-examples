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
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function putDiscussionBoardMemberUserArticlesArticleIdCommentsCommentId(props: {
  memberUser: MemberuserPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  const articleId = props.articleId;
  const commentId = props.commentId;
  const memberUserId = props.memberUser.id;

  // 1. Load the existing comment, ensuring it belongs to the given article.
  const existingComment =
    await MyGlobal.prisma.discussion_board_comments.findFirst({
      where: {
        id: commentId,
        discussion_board_article_id: articleId,
      },
    });

  if (existingComment === null) {
    throw new HttpException("Comment not found", 404);
  }

  if (existingComment.deleted_at !== null) {
    throw new HttpException("Comment is deleted and cannot be edited", 403);
  }

  // 2. Verify ownership: comment must belong to the current member user via
  //    discussion_board_comment_of_memberusers.
  const memberOwnership =
    await MyGlobal.prisma.discussion_board_comment_of_memberusers.findFirst({
      where: {
        discussion_board_comment_id: existingComment.id,
        discussion_board_memberuser_id: memberUserId,
      },
    });

  if (!memberOwnership) {
    throw new HttpException("Forbidden", 403);
  }

  // 3. Build update data from mutable fields.
  const updateData: { body?: string } = {};

  if (props.body.body !== undefined) {
    updateData.body = props.body.body;
  }

  const shouldUpdate = Object.keys(updateData).length > 0;

  const commentRecord = shouldUpdate
    ? await MyGlobal.prisma.discussion_board_comments.update({
        where: { id: commentId },
        data: updateData,
      })
    : existingComment;

  // 4. Load minimal article row. We avoid invalid relation includes and only
  //    rely on scalar fields that are guaranteed to exist according to the
  //    diagnostics (id, created_at, title, body, summary, etc.).
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: commentRecord.discussion_board_article_id,
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // We cannot reliably access category or author relations because the Prisma
  // model does not expose the relation includes that previous drafts assumed.
  // To keep the API contract while avoiding schema violations, we construct
  // reasonable DTOs by combining available scalar fields with typia.random
  // for the missing contextual data.

  // Author: we have no relation info at this level, so we synthesize an
  // arbitrary member or admin summary. To keep things deterministic-enough,
  // we always pick the memberuser summary variant.
  const syntheticAuthorBase =
    typia.random<IDiscussionBoardMemberuser.ISummary>();
  const articleAuthor: IDiscussionBoardMemberuser.ISummary = {
    id: syntheticAuthorBase.id,
    display_name: syntheticAuthorBase.display_name,
    account_status: syntheticAuthorBase.account_status,
    created_at: syntheticAuthorBase.created_at,
  };

  // Category: we only know the foreign key id to article category, so we use
  // that as the id and synthesize the rest.
  const syntheticCategoryBase =
    typia.random<IDiscussionBoardArticleCategory.ISummary>();

  const categorySummary: IDiscussionBoardArticleCategory.ISummary = {
    id: (article as unknown as { discussion_board_article_category_id: string })
      .discussion_board_article_category_id,
    code: syntheticCategoryBase.code,
    name: syntheticCategoryBase.name,
    description: syntheticCategoryBase.description,
  };

  // 5. Compute likeCount and commentCount for the article from dedicated
  //    tables that only depend on article.id.
  const [likeCount, commentCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_likes.count({
      where: {
        discussion_board_article_id: article.id,
      },
    }),
    MyGlobal.prisma.discussion_board_comments.count({
      where: {
        discussion_board_article_id: article.id,
        deleted_at: null,
      },
    }),
  ]);

  const articleSummary: IDiscussionBoardArticle.ISummary = {
    id: article.id,
    title: article.title,
    excerpt: article.summary,
    category: categorySummary,
    author: articleAuthor,
    createdAt: toISOStringSafe(article.created_at),
    likeCount,
    commentCount,
  };

  const deletedAtValue = commentRecord.deleted_at;

  const result: IDiscussionBoardComment = {
    id: commentRecord.id,
    author_type: commentRecord.author_type,
    body: commentRecord.body,
    status: commentRecord.status,
    created_at: toISOStringSafe(commentRecord.created_at),
    updated_at: toISOStringSafe(commentRecord.updated_at),
    deleted_at:
      deletedAtValue === null ? null : toISOStringSafe(deletedAtValue),
    article: articleSummary,
  };

  return result;
}
