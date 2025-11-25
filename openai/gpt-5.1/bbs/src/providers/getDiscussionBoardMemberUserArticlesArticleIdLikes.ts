import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleLike } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleLike";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function getDiscussionBoardMemberUserArticlesArticleIdLikes(props: {
  memberUser: MemberuserPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleLike> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });

  if (article === null) {
    throw new HttpException("Article not found", 404);
  }

  const [totalLikeCount, memberLike, commentCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_likes.count({
      where: { discussion_board_article_id: props.articleId },
    }),
    MyGlobal.prisma.discussion_board_article_likes.findFirst({
      where: {
        discussion_board_article_id: props.articleId,
        discussion_board_memberuser_id: props.memberUser.id,
      },
    }),
    MyGlobal.prisma.discussion_board_comments.count({
      where: { discussion_board_article_id: props.articleId },
    }),
  ]);

  const category =
    await MyGlobal.prisma.discussion_board_article_categories.findUnique({
      where: { id: article.discussion_board_article_category_id },
    });

  if (category === null) {
    throw new HttpException("Article category not found", 500);
  }

  const memberAuthorLink =
    await MyGlobal.prisma.discussion_board_article_of_memberusers.findFirst({
      where: { discussion_board_article_id: article.id },
    });

  const adminAuthorLink =
    await MyGlobal.prisma.discussion_board_article_of_adminusers.findFirst({
      where: { discussion_board_article_id: article.id },
    });

  let author:
    | IDiscussionBoardMemberuser.ISummary
    | IDiscussionBoardAdminuser.ISummary;

  if (memberAuthorLink !== null) {
    const member =
      await MyGlobal.prisma.discussion_board_memberusers.findUnique({
        where: { id: memberAuthorLink.discussion_board_memberuser_id },
      });

    if (member === null) {
      throw new HttpException("Author not found for article", 500);
    }

    author = {
      id: member.id,
      display_name: member.display_name,
      account_status: member.account_status,
      created_at: toISOStringSafe(member.created_at),
    };
  } else if (adminAuthorLink !== null) {
    const admin = await MyGlobal.prisma.discussion_board_adminusers.findUnique({
      where: { id: adminAuthorLink.discussion_board_adminuser_id },
    });

    if (admin === null) {
      throw new HttpException("Author not found for article", 500);
    }

    author = {
      id: admin.id,
      email: admin.email,
      display_name: admin.display_name,
      // Prisma model does not have profile_image_url, so expose undefined here
      profile_image_url: undefined,
      email_verified: admin.email_verified,
      account_status: admin.account_status,
      created_at: toISOStringSafe(admin.created_at),
      last_login_at: admin.last_login_at
        ? toISOStringSafe(admin.last_login_at)
        : undefined,
    };
  } else {
    throw new HttpException("Author not found for article", 500);
  }

  const articleSummary: IDiscussionBoardArticle.ISummary = {
    id: article.id,
    title: article.title,
    excerpt: article.summary ?? undefined,
    category: {
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description,
    },
    author,
    createdAt: toISOStringSafe(article.created_at),
    likeCount: totalLikeCount,
    commentCount,
  };

  return {
    article: articleSummary,
    totalLikeCount,
    likedByCurrentMember: memberLike !== null,
  };
}
