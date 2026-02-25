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
  // Verify article exists to provide clear error context
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Find the specific image file record
  const file = await MyGlobal.prisma.discussion_board_article_images.findUnique(
    {
      where: { id: props.fileId },
      select: {
        id: true,
        discussion_board_article_id: true,
        status: true,
        attachment_file_id: true,
      },
    },
  );
  // Check if file exists
  if (!file) {
    throw new HttpException("Image file not found", 404);
  }
  // Check if file belongs to the specified article
  if (file.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "Image file does not belong to the specified article",
      404,
    );
  }
  // Check if already deleted based on status
  if (file.status === "deleted") {
    throw new HttpException("Image file already deleted", 410);
  }
  // Delete the file record
  // Cascade will handle related records including attachment_file if cascade constraints are set
  await MyGlobal.prisma.discussion_board_article_images.delete({
    where: { id: props.fileId },
  });
}
