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

export async function deleteDiscussionBoardAdminArticlesArticleIdFilesFileId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: {
        id: props.articleId,
        deleted_at: null,
      },
    });
  const file =
    await MyGlobal.prisma.discussion_board_article_files.findUniqueOrThrow({
      where: {
        id: props.fileId,
        deleted_at: null,
      },
    });
  if (file.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "File does not belong to the specified article",
      404,
    );
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_article_files.update({
    where: {
      id: props.fileId,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
