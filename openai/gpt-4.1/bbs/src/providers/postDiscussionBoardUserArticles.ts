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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postDiscussionBoardUserArticles(props: {
  user: UserPayload;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  const now = toISOStringSafe(new Date());
  // Create article
  const article = await MyGlobal.prisma.discussion_board_articles.create({
    data: {
      id: v4(),
      user_id: props.user.id,
      title: props.body.title.trim(),
      content: props.body.content.trim(),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Fetch author summary
  const user = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: article.user_id },
  });
  if (!user) {
    throw new HttpException("Author not found", 500);
  }

  const result: IDiscussionBoardArticle = {
    id: article.id,
    title: article.title,
    content: article.content,
    author: {
      id: user.id,
      email: user.email,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      deleted_at:
        user.deleted_at === null ? undefined : toISOStringSafe(user.deleted_at),
    },
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at:
      article.deleted_at === null
        ? undefined
        : toISOStringSafe(article.deleted_at),
  };
  return result;
}
