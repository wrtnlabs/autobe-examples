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

export async function patchDiscussionBoardMemberUserArticlesArticleIdLikes(props: {
  memberUser: MemberuserPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleLike> {
  // 1. Load base article row by id
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
    },
  });

  if (article === null) {
    throw new HttpException("Article not found", 404);
  }

  // 2. In parallel, compute like count, member like existence, and comment count
  const [totalLikeCountRaw, memberLike, commentCountRaw] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_likes.count({
      where: {
        discussion_board_article_id: props.articleId,
      },
    }),
    MyGlobal.prisma.discussion_board_article_likes.findFirst({
      where: {
        discussion_board_article_id: props.articleId,
        discussion_board_memberuser_id: props.memberUser.id,
      },
      select: { id: true },
    }),
    MyGlobal.prisma.discussion_board_comments.count({
      where: {
        discussion_board_article_id: props.articleId,
      },
    }),
  ]);

  const likedByCurrentMember: boolean = memberLike !== null;

  // 3. Load category summary using the foreign key on the article
  const categoryRow =
    await MyGlobal.prisma.discussion_board_article_categories.findFirst({
      where: {
        id: article.discussion_board_article_category_id,
      },
    });

  if (categoryRow === null) {
    throw new HttpException("Article category not found", 500);
  }

  const category: IDiscussionBoardArticleCategory.ISummary = {
    id: categoryRow.id,
    code: categoryRow.code,
    name: categoryRow.name,
    description:
      categoryRow.description === null ? undefined : categoryRow.description,
  };

  // 4. Resolve author via subtype link tables (member or admin)
  let author:
    | IDiscussionBoardMemberuser.ISummary
    | IDiscussionBoardAdminuser.ISummary;

  // Try memberuser authorship first
  const memberLink =
    await MyGlobal.prisma.discussion_board_article_of_memberusers.findFirst({
      where: {
        discussion_board_article_id: article.id,
      },
    });

  if (memberLink !== null) {
    const member = await MyGlobal.prisma.discussion_board_memberusers.findFirst(
      {
        where: {
          id: memberLink.discussion_board_memberuser_id,
        },
      },
    );

    if (member === null) {
      throw new HttpException("Author member user not found", 500);
    }

    author = {
      id: member.id,
      display_name: member.display_name,
      account_status: member.account_status,
      created_at: toISOStringSafe(member.created_at),
    };
  } else {
    // Fallback to adminuser authorship
    const adminLink =
      await MyGlobal.prisma.discussion_board_article_of_adminusers.findFirst({
        where: {
          discussion_board_article_id: article.id,
        },
      });

    if (adminLink === null) {
      throw new HttpException("Author information is missing for article", 500);
    }

    const admin = await MyGlobal.prisma.discussion_board_adminusers.findFirst({
      where: {
        id: adminLink.discussion_board_adminuser_id,
      },
    });

    if (admin === null) {
      throw new HttpException("Author admin user not found", 500);
    }

    author = {
      id: admin.id,
      email: admin.email,
      display_name: admin.display_name,
      // profile_image_url field does not exist on Prisma model, so omit it here.
      email_verified: admin.email_verified,
      account_status: admin.account_status,
      created_at: toISOStringSafe(admin.created_at),
      last_login_at:
        admin.last_login_at === null
          ? undefined
          : toISOStringSafe(admin.last_login_at),
    };
  }

  // 5. Build excerpt using summary/body fields
  let excerpt: string | null | undefined;
  if (article.summary !== null) {
    excerpt = article.summary;
  } else if (article.body !== null) {
    excerpt = article.body;
  } else {
    excerpt = undefined;
  }

  // 6. Assemble article summary DTO
  const articleSummary: IDiscussionBoardArticle.ISummary = {
    id: article.id,
    title: article.title,
    excerpt,
    category,
    author,
    createdAt: toISOStringSafe(article.created_at),
    likeCount: totalLikeCountRaw,
    commentCount: commentCountRaw,
  };

  // 7. Final like engagement DTO
  const result: IDiscussionBoardArticleLike = {
    article: articleSummary,
    totalLikeCount: totalLikeCountRaw,
    likedByCurrentMember,
  };

  return result;
}
