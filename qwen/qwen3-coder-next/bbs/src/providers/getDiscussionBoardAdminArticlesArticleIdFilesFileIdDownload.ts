import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminArticlesArticleIdFilesFileIdDownload(props: {
  admin: AdminPayload;
  articleId: string;
  fileId: string;
}): Promise<IDiscussionBoardArticleFile.IDownload> {
  // Find the file record
  const file = await MyGlobal.prisma.discussion_board_article_files.findFirst({
    where: {
      id: props.fileId,
      article_id: props.articleId,
    },
  });
  if (!file) {
    throw new HttpException("File not found", 404);
  }
  return {
    downloadUrl: file.file_path,
    mimeType: file.mime_type,
    originalFilename: file.original_filename,
    fileSize: file.file_size,
  };
}
