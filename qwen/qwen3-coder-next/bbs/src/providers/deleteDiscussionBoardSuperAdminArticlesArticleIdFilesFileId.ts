import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminArticlesArticleIdFilesFileId(props: {
  superAdmin: SuperadminPayload;
  articleId: string;
  fileId: string;
}): Promise<IDiscussionBoardArticleFile> {
  // First verify the file exists and belongs to the specified article
  const targetFile =
    await MyGlobal.prisma.discussion_board_article_files.findUnique({
      where: {
        id: props.fileId as string & tags.Format<"uuid">,
      },
    });
  if (!targetFile) {
    throw new HttpException("File not found", 404);
  }
  if (targetFile.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "File does not belong to the specified article",
      404,
    );
  }
  // Perform soft delete by updating deleted_at timestamp
  const deletedFile =
    await MyGlobal.prisma.discussion_board_article_files.update({
      where: {
        id: props.fileId as string & tags.Format<"uuid">,
      },
      data: {
        deleted_at: toISOStringSafe(new Date()),
      },
    });
  // Transform database record to response DTO
  return {
    id: deletedFile.id,
    discussion_board_article_id: deletedFile.discussion_board_article_id,
    original_name: deletedFile.original_name,
    stored_path: deletedFile.stored_path,
    file_type: deletedFile.file_type,
    file_size: deletedFile.file_size,
    created_at: toISOStringSafe(deletedFile.created_at),
    updated_at: toISOStringSafe(deletedFile.updated_at),
    deleted_at: deletedFile.deleted_at
      ? toISOStringSafe(deletedFile.deleted_at)
      : undefined,
  };
}
