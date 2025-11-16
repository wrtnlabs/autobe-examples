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
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putDiscussionBoardUserArticlesArticleId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // 1. Fetch the article
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found.", 404);
  }
  if (!article.author_user_id || article.author_user_id !== props.user.id) {
    throw new HttpException(
      "You are not authorized to update this article.",
      403,
    );
  }
  if (!props.body.title && !props.body.body) {
    throw new HttpException(
      "At least one of title or body must be provided for update.",
      400,
    );
  }
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      ...(props.body.title ? { title: props.body.title } : {}),
      ...(props.body.body ? { body: props.body.body } : {}),
      updated_at: now,
    },
  });
  const user = article.author_user_id
    ? await MyGlobal.prisma.discussion_board_users.findUnique({
        where: { id: article.author_user_id },
      })
    : undefined;
  return {
    id: updated.id,
    title: updated.title,
    body: updated.body,
    author_user: user
      ? {
          id: user.id,
          email: user.email,
          is_email_verified: user.is_email_verified,
          is_active: user.is_active,
          is_blocked: user.is_blocked,
          created_at: toISOStringSafe(user.created_at),
          updated_at: toISOStringSafe(user.updated_at),
          deleted_at:
            user.deleted_at !== null
              ? toISOStringSafe(user.deleted_at)
              : undefined,
        }
      : undefined,
    author_admin: undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
