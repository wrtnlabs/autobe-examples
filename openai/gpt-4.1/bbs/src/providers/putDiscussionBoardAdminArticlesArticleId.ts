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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  const { articleId, body } = props;
  const now = toISOStringSafe(new Date());

  // 1. Find the article; error if missing or soft-deleted
  const existing = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
  });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Article not found or already deleted", 404);
  }

  // 2. Build update data object (only provided fields)
  const updateData: Record<string, unknown> = {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.content !== undefined ? { content: body.content } : {}),
    updated_at: now,
  };
  // 3. If updateData has no updatable fields, throw
  if (!body.title && !body.content) {
    throw new HttpException("No updatable fields provided", 400);
  }

  // 4. Update
  const updated = await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: articleId },
    data: updateData,
  });

  // 5. Get author
  const author = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: updated.user_id },
  });
  if (!author) {
    throw new HttpException("Author not found", 500);
  }

  // 6. Return API DTO
  return {
    id: updated.id,
    title: updated.title,
    content: updated.content,
    author: {
      id: author.id,
      email: author.email,
      created_at: toISOStringSafe(author.created_at),
      updated_at: toISOStringSafe(author.updated_at),
      deleted_at: author.deleted_at
        ? toISOStringSafe(author.deleted_at)
        : undefined,
    },
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
