import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function getDiscussionBoardArticlesArticleId(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    include: {
      authorUser: true,
      authorAdmin: true,
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  return {
    id: article.id,
    title: article.title,
    body: article.body,
    author_user:
      article.author_user_id && article.authorUser
        ? {
            id: article.authorUser.id,
            email: article.authorUser.email,
            is_email_verified: article.authorUser.is_email_verified,
            is_active: article.authorUser.is_active,
            is_blocked: article.authorUser.is_blocked,
            created_at: toISOStringSafe(article.authorUser.created_at),
            updated_at: toISOStringSafe(article.authorUser.updated_at),
            deleted_at:
              article.authorUser.deleted_at === null
                ? undefined
                : toISOStringSafe(article.authorUser.deleted_at),
          }
        : undefined,
    author_admin:
      article.author_admin_id && article.authorAdmin
        ? {
            id: article.authorAdmin.id,
            display_name: article.authorAdmin.email,
          }
        : undefined,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
  };
}
