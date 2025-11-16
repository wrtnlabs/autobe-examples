import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function getDiscussionBoardArticlesArticleId(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    include: {
      member: true,
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  const updated = await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      view_count: { increment: 1 },
    },
    include: {
      member: true,
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    body: updated.body,
    view_count: updated.view_count,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    author: {
      id: updated.member.id,
      username: updated.member.username,
      email: updated.member.email,
      status: updated.member.status,
      email_verified: updated.member.email_verified,
      created_at: toISOStringSafe(updated.member.created_at),
    },
  };
}
