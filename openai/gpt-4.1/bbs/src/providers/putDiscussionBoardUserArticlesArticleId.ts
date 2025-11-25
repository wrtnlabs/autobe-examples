import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putDiscussionBoardUserArticlesArticleId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // Step 1: Find the article and verify authorization
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article || article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  if (article.user_id !== props.user.id) {
    throw new HttpException("You are not authorized to edit this article", 403);
  }

  // Step 2: Prepare patch fields
  const updates: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (
    Object.prototype.hasOwnProperty.call(props.body, "title") &&
    typeof props.body.title !== "undefined"
  ) {
    updates.title = props.body.title;
  }
  if (
    Object.prototype.hasOwnProperty.call(props.body, "content") &&
    typeof props.body.content !== "undefined"
  ) {
    updates.content = props.body.content;
  }
  if (Object.keys(updates).length === 1) {
    throw new HttpException("No fields to update", 400);
  }

  // Step 3: Perform update
  const updated = await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: updates,
  });

  // Step 4: Fetch author info
  const user = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: updated.user_id },
  });
  if (!user) {
    throw new HttpException("Author not found", 500);
  }

  const author: IDiscussionBoardUser.ISummary = {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      typeof user.deleted_at === "undefined"
        ? undefined
        : user.deleted_at === null
          ? null
          : toISOStringSafe(user.deleted_at),
  };

  return {
    id: updated.id,
    title: updated.title,
    content: updated.content,
    author,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined"
        ? undefined
        : updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at),
  };
}
