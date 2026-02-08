import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorArticlesArticleId(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId, deleted_at: null },
    select: {
      id: true,
      section_id: true,
      title: true,
      content: true,
      registered_user_id: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  return {
    id: article.id,
    section_id: article.section_id,
    title: article.title,
    content: article.content,
    registered_user_id: article.registered_user_id,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    tags: [],
    author: {
      id: "",
      email: "",
      nickname: "",
      created_at: "",
      updated_at: "",
    },
    files: [],
    images: [],
  };
}
