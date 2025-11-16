import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function postDiscussionBoardMemberUserArticlesArticleIdLikes(props: {
  memberUser: MemberuserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleLike.ICreate;
}): Promise<IDiscussionBoardArticleLike> {
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const article = await tx.discussion_board_articles.findFirst({
      where: {
        id: props.articleId,
      },
    });

    if (article === null) {
      throw new HttpException("Article not found", 404);
    }

    const existingLike = await tx.discussion_board_article_likes.findFirst({
      where: {
        discussion_board_article_id: props.articleId,
        discussion_board_memberuser_id: props.memberUser.id,
      },
    });

    if (existingLike === null) {
      await tx.discussion_board_article_likes.create({
        data: {
          id: v4(),
          discussion_board_article_id: props.articleId,
          discussion_board_memberuser_id: props.memberUser.id,
          created_at: new Date(),
        },
      });
    }

    const totalLikeCount = await tx.discussion_board_article_likes.count({
      where: {
        discussion_board_article_id: props.articleId,
      },
    });

    const commentCount = await tx.discussion_board_comments.count({
      where: {
        discussion_board_article_id: props.articleId,
      },
    });

    const category = await tx.discussion_board_article_categories.findFirst({
      where: {
        id: article.discussion_board_article_category_id,
      },
    });

    if (category === null) {
      throw new HttpException("Article category not found", 500);
    }

    const articleOfMember =
      await tx.discussion_board_article_of_memberusers.findFirst({
        where: {
          discussion_board_article_id: article.id,
        },
      });

    let authorSummary:
      | IDiscussionBoardMemberuser.ISummary
      | IDiscussionBoardAdminuser.ISummary;

    if (articleOfMember !== null) {
      const member = await tx.discussion_board_memberusers.findFirst({
        where: {
          id: articleOfMember.discussion_board_memberuser_id,
        },
      });

      if (member === null) {
        throw new HttpException("Article author (member) not found", 500);
      }

      authorSummary = {
        id: member.id,
        display_name: member.display_name,
        account_status: member.account_status,
        created_at: toISOStringSafe(member.created_at),
      };
    } else {
      const articleOfAdmin =
        await tx.discussion_board_article_of_adminusers.findFirst({
          where: {
            discussion_board_article_id: article.id,
          },
        });

      if (articleOfAdmin === null) {
        throw new HttpException("Article author not found", 500);
      }

      const admin = await tx.discussion_board_adminusers.findFirst({
        where: {
          id: articleOfAdmin.discussion_board_adminuser_id,
        },
      });

      if (admin === null) {
        throw new HttpException("Article author (admin) not found", 500);
      }

      authorSummary = {
        id: admin.id,
        email: admin.email,
        display_name: admin.display_name,
        // profile_image_url field does not exist on admin Prisma type per error
        email_verified: admin.email_verified,
        account_status: admin.account_status,
        created_at: toISOStringSafe(admin.created_at),
        last_login_at:
          admin.last_login_at !== null
            ? toISOStringSafe(admin.last_login_at)
            : undefined,
      };
    }

    const articleSummary: IDiscussionBoardArticle.ISummary = {
      id: article.id,
      title: article.title,
      excerpt:
        article.summary !== null && article.summary !== undefined
          ? article.summary
          : undefined,
      category: {
        id: category.id,
        code: category.code,
        name: category.name,
        description:
          category.description !== null && category.description !== undefined
            ? category.description
            : undefined,
      },
      author: authorSummary,
      createdAt: toISOStringSafe(article.created_at),
      likeCount: totalLikeCount,
      commentCount: commentCount,
    };

    const likeDto: IDiscussionBoardArticleLike = {
      article: articleSummary,
      totalLikeCount: totalLikeCount,
      likedByCurrentMember: true,
    };

    return likeDto;
  });

  return result;
}
