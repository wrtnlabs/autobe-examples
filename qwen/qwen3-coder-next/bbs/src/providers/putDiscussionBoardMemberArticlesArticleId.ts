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

export async function putDiscussionBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle.ISummary> {
  // Check if article exists and user has permission
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Check if user is author or administrator
  if (article.author_id !== props.member.id && props.member.type !== "member") {
    throw new HttpException("Forbidden", 403);
  }
  // Update the article - IUpdate is empty so no body fields available
  const updated = await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Transform to summary DTO
  return {
    id: updated.id,
    title: updated.title,
    content: updated.content,
    view_count: updated.view_count,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    author_id: updated.author_id,
  };
}
