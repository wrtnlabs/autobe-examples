import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleFileAtDownloadTransformer } from "../transformers/DiscussionBoardArticleFileAtDownloadTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdFilesFileId(props: {
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleFile.IDownload> {
  const file = await MyGlobal.prisma.discussion_board_article_files.findUnique({
    where: {
      id: props.fileId,
      deleted_at: null,
    },
    select: {
      ...DiscussionBoardArticleFileAtDownloadTransformer.select().select,
      discussion_board_article_id: true,
      article: {
        select: {
          id: true,
          deleted_at: true,
        },
      },
    },
  });
  if (!file) {
    throw new HttpException("File not found or already deleted", 410);
  }
  if (file.article.deleted_at !== null) {
    throw new HttpException("Parent article has been deleted", 404);
  }
  if (file.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "File does not belong to the specified article",
      404,
    );
  }
  return {
    uri: file.path,
    originalName: file.original_name,
    mimeType: file.mime_type,
    size: file.size,
  };
}
