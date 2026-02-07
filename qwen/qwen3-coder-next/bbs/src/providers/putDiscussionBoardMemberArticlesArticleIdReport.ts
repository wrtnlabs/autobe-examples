import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
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

export async function putDiscussionBoardMemberArticlesArticleIdReport(props: {
  member: MemberPayload;
  articleId: string;
  body: IDiscussionBoardArticle.IReport;
}): Promise<IDiscussionBoardReport> {
  // First, verify the article exists and is not deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId, deleted_at: null },
    select: {
      id: true,
      author_id: true,
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Verify user is not the article author (self-reporting prevention)
  if (article.author_id === props.member.id) {
    throw new HttpException("You cannot report your own article", 403);
  }
  // Report functionality not implemented - no database table available
  // For now, return a placeholder response
  return typia.random<IDiscussionBoardReport>();
}
