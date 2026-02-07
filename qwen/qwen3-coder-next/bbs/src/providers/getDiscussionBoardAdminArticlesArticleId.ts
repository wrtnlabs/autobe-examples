import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string;
}): Promise<IDiscussionBoardArticle> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: {
      id: true,
      title: true,
      content: true,
      view_count: true,
      created_at: true,
      updated_at: true,
      author_id: true,
      section_id: true,
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  return {
    id: article.id,
    title: article.title,
    content: article.content,
    view_count: article.view_count,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    author_id: article.author_id,
    section_id: article.section_id,
    author: {
      id: article.author_id,
      email: "",
    },
    section: {
      id: article.section_id,
      description: "",
    },
    files: [],
    images: [],
    tags: [],
  };
}
