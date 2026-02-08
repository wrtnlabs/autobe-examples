import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardRegisteredUserArticlesArticleIdFilesFileId(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleFile> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true },
  });
  if (!article) throw new HttpException("Article not found", 404);
  const file = await MyGlobal.prisma.discussion_board_article_files.findFirst({
    where: { id: props.fileId, article_id: props.articleId },
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
  if (!file) throw new HttpException("File not found", 404);
  return {
    id: file.id,
    file_name: file.file_name,
    file_type: file.file_type,
    file_size: file.file_size,
    download_url: file.download_url,
    created_at: toISOStringSafe(file.created_at),
    updated_at: toISOStringSafe(file.updated_at),
  };
}
