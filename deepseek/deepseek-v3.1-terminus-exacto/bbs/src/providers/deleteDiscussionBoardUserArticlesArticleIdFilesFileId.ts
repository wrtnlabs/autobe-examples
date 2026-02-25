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
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify article exists and belongs to user
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      author: {
        id: props.user.id,
      },
    },
  });
  if (!article) {
    throw new HttpException("Article not found or access denied", 404);
  }
  // Verify file exists and belongs to the article
  const file = await MyGlobal.prisma.discussion_board_article_files.findFirst({
    where: {
      id: props.fileId,
      article: {
        id: props.articleId,
      },
    },
  });
  if (!file) {
    throw new HttpException("File not found", 404);
  }
  // Soft delete the file by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_article_files.update({
    where: {
      id: props.fileId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
