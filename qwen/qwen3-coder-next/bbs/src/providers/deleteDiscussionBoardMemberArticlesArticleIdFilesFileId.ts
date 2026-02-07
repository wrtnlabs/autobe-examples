import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardMemberArticlesArticleIdFilesFileId(props: {
  member: MemberPayload;
  articleId: string;
  fileId: string;
}): Promise<IDiscussionBoardArticleFile> {
  // Verify the file exists and belongs to the specified article
  const file = await MyGlobal.prisma.discussion_board_article_files.findUnique({
    where: { id: props.fileId },
    select: {
      id: true,
      discussion_board_article_id: true,
      original_name: true,
      stored_path: true,
      file_type: true,
      file_size: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!file) {
    throw new HttpException("File not found", 404);
  }
  // Verify the file belongs to the specified article
  if (file.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "File does not belong to the specified article",
      404,
    );
  }
  // Perform soft delete
  const deletedFile =
    await MyGlobal.prisma.discussion_board_article_files.update({
      where: { id: props.fileId },
      data: {
        deleted_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
      select: {
        id: true,
        discussion_board_article_id: true,
        original_name: true,
        stored_path: true,
        file_type: true,
        file_size: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Return properly typed response
  return {
    id: deletedFile.id,
    article_id: deletedFile.discussion_board_article_id,
    original_name: deletedFile.original_name,
    stored_path: deletedFile.stored_path,
    file_type: deletedFile.file_type,
    file_size: deletedFile.file_size,
    created_at: deletedFile.created_at,
    updated_at: deletedFile.updated_at,
    deleted_at: deletedFile.deleted_at,
  };
}
