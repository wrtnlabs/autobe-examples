import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserArticlesArticleId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  // First verify the article exists and get basic info for authorization
  const articleBasic =
    await MyGlobal.prisma.discussion_board_articles.findUnique({
      where: { id: props.articleId },
      select: {
        id: true,
        status: true,
        discussion_board_user_id: true,
        deleted_at: true,
      },
    });
  if (!articleBasic || articleBasic.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  // Authorization logic based on article status
  let authorized = false;
  if (articleBasic.status === "published") {
    // Published articles visible to all authenticated users
    authorized = true;
  } else if (articleBasic.status === "draft") {
    // Draft articles only visible to the author
    authorized = articleBasic.discussion_board_user_id === props.user.id;
  } else if (articleBasic.status === "archived") {
    // Archived articles are NOT accessible to regular users - only administrators
    // Regular users cannot view archived articles
    authorized = false;
  }
  if (!authorized) {
    throw new HttpException("Article not found", 404);
  }
  // Retrieve full article with transformer
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      ...DiscussionBoardArticleTransformer.select(),
    });
  return await DiscussionBoardArticleTransformer.transform(article);
}
