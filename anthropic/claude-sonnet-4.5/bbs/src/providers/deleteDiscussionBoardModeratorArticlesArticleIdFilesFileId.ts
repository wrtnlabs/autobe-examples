import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorArticlesArticleIdFilesFileId(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existingFile =
    await MyGlobal.prisma.discussion_board_article_files.findUnique({
      where: { id: props.fileId },
    });

  if (!existingFile) {
    throw new HttpException("File attachment not found", 404);
  }

  if (existingFile.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "File does not belong to the specified article",
      404,
    );
  }

  await MyGlobal.prisma.discussion_board_article_files.delete({
    where: { id: props.fileId },
  });
}
