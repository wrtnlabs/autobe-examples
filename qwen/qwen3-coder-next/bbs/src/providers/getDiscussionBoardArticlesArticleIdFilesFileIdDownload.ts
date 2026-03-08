import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdFilesFileIdDownload(props: {
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  const file = await MyGlobal.prisma.discussion_board_article_files.findUnique({
    where: {
      id: props.fileId,
      discussion_board_article_id: props.articleId,
    },
    select: {
      id: true,
      file_name: true,
      file_url: true,
      file_size: true,
      file_type: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!file) {
    throw new HttpException("File not found", 404);
  }
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true, deleted_at: true },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  if (article.deleted_at !== null) {
    throw new HttpException("Article has been deleted", 404);
  }
  const response = await fetch(file.file_url);
  if (!response.ok) {
    throw new HttpException("Failed to retrieve file", 500);
  }
  const buffer = await response.arrayBuffer();
  return;
}
