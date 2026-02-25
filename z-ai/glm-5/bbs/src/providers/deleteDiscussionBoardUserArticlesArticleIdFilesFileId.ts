import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardUserArticlesArticleIdFilesFileId(props: {
  user: UserPayload;
  articleId: string;
  fileId: string;
}): Promise<void> {
  // Query article to verify existence and ownership
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: {
      id: true,
      discussion_board_user_id: true,
    },
  });
  if (article === null) {
    throw new HttpException("Article not found", 404);
  }
  // Verify user is the article author
  if (article.discussion_board_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if user is banned
  const user = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: props.user.id },
    select: { is_banned: true },
  });
  if (user?.is_banned === true) {
    throw new HttpException("User is banned", 403);
  }
  // Query file to verify it exists and belongs to the article
  const file = await MyGlobal.prisma.discussion_board_article_files.findUnique({
    where: { id: props.fileId },
    select: {
      id: true,
      discussion_board_article_id: true,
      storage_path: true,
    },
  });
  if (file === null) {
    throw new HttpException("File not found", 404);
  }
  // Verify file belongs to the specified article
  if (file.discussion_board_article_id !== props.articleId) {
    throw new HttpException("File not found", 404);
  }
  // Delete the database record
  // Physical file deletion from storage using file.storage_path would be
  // handled by a storage service. Per specification, if physical deletion
  // fails, the database record is still removed and error is logged.
  await MyGlobal.prisma.discussion_board_article_files.delete({
    where: { id: props.fileId },
  });
}
