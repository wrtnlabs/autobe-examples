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

export async function postDiscussionBoardAdminUserArticlesArticleIdComments(props: {
  adminUser: AdminuserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  // 1. Ensure the target article exists and is not soft-deleted (if schema supports it).
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
    },
  });

  if (article === null) {
    throw new HttpException("Article not found", 404);
  }

  // 2. Create the core comment record.
  const createdComment = await MyGlobal.prisma.discussion_board_comments.create(
    {
      data: {
        id: v4(),
        discussion_board_article_id: props.articleId,
        body: props.body.body,
        status: "active",
        author_type: "adminuser",
        created_at: new Date(),
        updated_at: new Date(),
      },
    },
  );

  // 3. Create the ownership subtype record for admin user.
  await MyGlobal.prisma.discussion_board_comment_of_adminusers.create({
    data: {
      id: v4(),
      discussion_board_comment_id: createdComment.id,
      discussion_board_adminuser_id: props.adminUser.id,
      discussion_board_adminuser_session_id: props.adminUser.session_id,
      created_at: new Date(),
    },
  });

  // 4. Compute like and comment counts for the article.
  const [likeCount, commentCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_likes.count({
      where: {
        discussion_board_article_id: article.id,
      },
    }),
    MyGlobal.prisma.discussion_board_comments.count({
      where: {
        discussion_board_article_id: article.id,
      },
    }),
  ]);

  // 5. Load related data for article summary: category and author (member or admin).
  const category =
    await MyGlobal.prisma.discussion_board_article_categories.findFirst({
      where: {
        id: article.discussion_board_article_category_id,
      },
    });

  if (category === null) {
    throw new HttpException("Article category not found", 500);
  }

  // Determine article author: try member author first, then admin author.
  const articleOfMember =
    await MyGlobal.prisma.discussion_board_article_of_memberusers.findFirst({
      where: {
        discussion_board_article_id: article.id,
      },
    });

  let authorSummary:
    | IDiscussionBoardMemberuser.ISummary
    | IDiscussionBoardAdminuser.ISummary;

  if (articleOfMember !== null) {
    const member = await MyGlobal.prisma.discussion_board_memberusers.findFirst(
      {
        where: {
          id: articleOfMember.discussion_board_memberuser_id,
        },
      },
    );

    if (member === null) {
      throw new HttpException("Article member author not found", 500);
    }

    authorSummary = {
      id: member.id,
      display_name: member.display_name,
      account_status: member.account_status,
      created_at: toISOStringSafe(member.created_at),
    };
  } else {
    const articleOfAdmin =
      await MyGlobal.prisma.discussion_board_article_of_adminusers.findFirst({
        where: {
          discussion_board_article_id: article.id,
        },
      });

    if (articleOfAdmin === null) {
      throw new HttpException("Article author not found", 500);
    }

    const admin = await MyGlobal.prisma.discussion_board_adminusers.findFirst({
      where: {
        id: articleOfAdmin.discussion_board_adminuser_id,
      },
    });

    if (admin === null) {
      throw new HttpException("Article admin author not found", 500);
    }

    authorSummary = {
      id: admin.id,
      email: admin.email,
      display_name: admin.display_name,
      email_verified: admin.email_verified,
      account_status: admin.account_status,
      created_at: toISOStringSafe(admin.created_at),
      last_login_at:
        admin.last_login_at !== null
          ? toISOStringSafe(admin.last_login_at)
          : undefined,
    };
  }

  // 6. Build the article summary DTO required by IDiscussionBoardComment.
  const articleSummary: IDiscussionBoardArticle.ISummary = {
    id: article.id,
    title: article.title,
    excerpt: article.summary ?? null,
    category: {
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description ?? null,
    },
    author: authorSummary,
    createdAt: toISOStringSafe(article.created_at),
    likeCount,
    commentCount,
  };

  // 7. Build and return the IDiscussionBoardComment DTO.
  const result: IDiscussionBoardComment = {
    id: createdComment.id,
    author_type: "adminuser",
    body: createdComment.body,
    status: createdComment.status,
    created_at: toISOStringSafe(createdComment.created_at),
    updated_at: toISOStringSafe(createdComment.updated_at),
    deleted_at:
      createdComment.deleted_at !== null
        ? toISOStringSafe(createdComment.deleted_at)
        : null,
    article: articleSummary,
  };

  return result;
}
