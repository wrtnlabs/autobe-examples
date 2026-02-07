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

export async function deleteDiscussionBoardAdminArticlesArticleIdFilesFileId(props: {
  admin: AdminPayload;
  articleId: string;
  fileId: string;
}): Promise<IDiscussionBoardArticleFile> {
  const file = await MyGlobal.prisma.discussion_board_article_files.findUnique({
    where: {
      id: props.fileId,
      discussion_board_article_id: props.articleId,
    },
    select: {
      id: true,
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
  const deleted = await MyGlobal.prisma.discussion_board_article_files.update({
    where: {
      id: props.fileId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: deleted.id as string & tags.Format<"uuid">,
    original_name: deleted.original_name,
    stored_path: deleted.stored_path,
    file_type: deleted.file_type,
    file_size: deleted.file_size,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at: deleted.deleted_at ? toISOStringSafe(deleted.deleted_at) : null,
  };
}
