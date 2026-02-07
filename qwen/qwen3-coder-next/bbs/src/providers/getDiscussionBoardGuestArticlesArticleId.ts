import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardGuestArticlesArticleId(props: {
  guest: GuestPayload;
  articleId: string;
}): Promise<IDiscussionBoardArticle> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    include: {
      author: true,
      section: true,
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  if (article.deleted_at !== null) {
    throw new HttpException("Article has been deleted", 404);
  }
  return {
    id: article.id,
    author_id: article.author_id,
    section_id: article.section_id,
    title: article.title,
    content: article.content,
    view_count: article.view_count,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at:
      article.deleted_at === null
        ? undefined
        : toISOStringSafe(article.deleted_at),
  };
}
