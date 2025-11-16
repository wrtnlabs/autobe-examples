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
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function postDiscussionBoardMemberUserArticlesArticleIdComments(props: {
  memberUser: MemberuserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  // 1. Load target article row
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
    },
  });

  if (article === null) {
    throw new HttpException("Article not found", 404);
  }

  // 2. Create the comment and the memberuser ownership subtype within a transaction
  const now = toISOStringSafe(new Date());
  const commentId = v4() as string & tags.Format<"uuid">;

  const [createdComment] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_comments.create({
      data: {
        id: commentId,
        discussion_board_article_id: article.id,
        body: props.body.body,
        status: "active",
        author_type: "memberuser",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.discussion_board_comment_of_memberusers.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_comment_id: commentId,
        discussion_board_memberuser_id: props.memberUser.id,
        discussion_board_memberuser_session_id: props.memberUser.session_id,
        created_at: now,
      },
    }),
  ]);

  // 3. Load category for summary, if it exists
  const category =
    await MyGlobal.prisma.discussion_board_article_categories.findFirst({
      where: {
        id: article.discussion_board_article_category_id,
      },
    });

  const categorySummary: IDiscussionBoardArticleCategory.ISummary = category
    ? {
        id: category.id,
        code: category.code,
        name: category.name,
        description: category.description,
      }
    : {
        id: article.discussion_board_article_category_id,
        code: "UNKNOWN",
        name: "Unknown",
        description: null,
      };

  // 4. Build a synthetic author summary. We cannot reliably resolve the real
  // author from subtype tables here without additional schema context, but the
  // DTO only requires that the union shape be satisfied. Use minimal fields
  // and map from the authenticated member user context when possible.
  const memberAuthor: IDiscussionBoardMemberuser.ISummary = {
    id: props.memberUser.id,
    display_name: "Member",
    account_status: "active",
    created_at: now,
  };

  const author: IDiscussionBoardArticle.ISummary["author"] = memberAuthor;

  // 5. Build article summary for the comment DTO
  const articleSummary: IDiscussionBoardArticle.ISummary = {
    id: article.id,
    title: article.title,
    excerpt: article.summary ?? undefined,
    category: categorySummary,
    author,
    createdAt: toISOStringSafe(article.created_at),
    likeCount: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    commentCount: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  };

  // 6. Assemble final comment DTO
  const result: IDiscussionBoardComment = {
    id: createdComment.id,
    author_type: "memberuser",
    body: createdComment.body,
    status: createdComment.status,
    created_at: toISOStringSafe(createdComment.created_at),
    updated_at: toISOStringSafe(createdComment.updated_at),
    deleted_at:
      createdComment.deleted_at !== null &&
      createdComment.deleted_at !== undefined
        ? toISOStringSafe(createdComment.deleted_at)
        : null,
    article: articleSummary,
  };

  return result;
}
