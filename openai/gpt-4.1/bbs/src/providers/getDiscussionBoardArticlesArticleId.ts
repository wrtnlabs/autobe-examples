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

export async function getDiscussionBoardArticlesArticleId(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    include: {
      user: true,
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  const user = article.user;

  if (!user) {
    throw new HttpException("Author not found", 500);
  }

  const author: IDiscussionBoardUser.ISummary = {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    ...(user.deleted_at === null
      ? {}
      : {
          deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
        }),
  };

  return {
    id: article.id,
    title: article.title,
    content: article.content,
    author,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    ...(article.deleted_at === null
      ? {}
      : {
          deleted_at: article.deleted_at
            ? toISOStringSafe(article.deleted_at)
            : null,
        }),
  };
}
