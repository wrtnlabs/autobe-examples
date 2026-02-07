import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMemberArticlesArticleIdAnalytics(props: {
  member: MemberPayload;
  articleId: string;
}): Promise<IDiscussionBoardArticle.IAnalytic> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: {
      view_count: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  return {
    view_count: article.view_count,
    days_since_publication: Math.floor(
      (Date.now() - new Date(article.created_at).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
    days_since_update: Math.floor(
      (Date.now() - new Date(article.updated_at).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  };
}
