import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorArticlesArticleIdFilesFileId(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleFile> {
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: { id: props.articleId, deleted_at: null },
    select: { id: true },
  });
  if (article === null) throw new HttpException("Article not found", 404);
  const file = await MyGlobal.prisma.discussion_board_article_files.findFirst({
    where: { id: props.fileId, article_id: props.articleId, deleted_at: null },
    select: {
      id: true,
      file_name: true,
      file_type: true,
      file_size: true,
      download_url: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (file === null) throw new HttpException("File not found", 404);
  return {
    id: file.id,
    fileName: file.file_name,
    fileType: file.file_type,
    fileSize: file.file_size,
    downloadUrl: file.download_url,
    createdAt: toISOStringSafe(file.created_at),
    updatedAt: toISOStringSafe(file.updated_at),
  };
}
