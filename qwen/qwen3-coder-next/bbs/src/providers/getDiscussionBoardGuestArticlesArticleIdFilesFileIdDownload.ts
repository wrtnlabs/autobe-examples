import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardGuestArticlesArticleIdFilesFileIdDownload(props: {
  guest: GuestPayload;
  articleId: string;
  fileId: string;
}): Promise<IDiscussionBoardArticleFile> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  const file = await MyGlobal.prisma.discussion_board_article_files.findUnique({
    where: { id: props.fileId },
  });
  if (!file) {
    throw new HttpException("File not found", 404);
  }
  if (file.discussion_board_article_id !== props.articleId) {
    throw new HttpException("File does not belong to this article", 404);
  }
  return {
    id: file.id as string & tags.Format<"uuid">,
    article_id: file.discussion_board_article_id as string &
      tags.Format<"uuid">,
    original_name: file.original_name,
    stored_path: file.stored_path,
    file_type: file.file_type,
    file_size: file.file_size,
    created_at: toISOStringSafe(file.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(file.updated_at) as string &
      tags.Format<"date-time">,
  };
}
