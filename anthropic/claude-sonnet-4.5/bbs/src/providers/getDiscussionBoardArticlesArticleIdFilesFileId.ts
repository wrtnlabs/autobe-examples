import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";

export async function getDiscussionBoardArticlesArticleIdFilesFileId(props: {
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleFile> {
  const file = await MyGlobal.prisma.discussion_board_article_files.findUnique({
    where: { id: props.fileId },
  });

  if (!file) {
    throw new HttpException("File not found", 404);
  }

  if (file.discussion_board_article_id !== props.articleId) {
    throw new HttpException("File not found", 404);
  }

  if (file.deleted_at !== null) {
    throw new HttpException("File not found", 404);
  }

  return {
    id: file.id,
    discussion_board_article_id: file.discussion_board_article_id,
    original_filename: file.original_filename,
    file_size: file.file_size,
    content_type: file.content_type,
    storage_url: file.storage_url,
    created_at: toISOStringSafe(file.created_at),
    deleted_at: null,
  };
}
