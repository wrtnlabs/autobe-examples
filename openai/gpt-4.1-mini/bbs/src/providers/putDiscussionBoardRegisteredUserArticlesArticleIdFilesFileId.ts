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

export async function putDiscussionBoardRegisteredUserArticlesArticleIdFilesFileId(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IUpdate;
}): Promise<IDiscussionBoardArticleFile> {
  const file = await MyGlobal.prisma.discussion_board_article_files.findUnique({
    where: { id: props.fileId },
  });
  if (!file) throw new HttpException("File not found", 404);
  if (file.article_id !== props.articleId)
    throw new HttpException("File does not belong to article", 400);
  if (!("authorId" in file) || file.authorId !== props.registeredUser.id)
    throw new HttpException("Forbidden", 403);
  const updatedFile =
    await MyGlobal.prisma.discussion_board_article_files.update({
      where: { id: props.fileId },
      data: {
        ...props.body,
        updated_at: new Date(),
      },
    });
  return {
    id: updatedFile.id,
    created_at: toISOStringSafe(updatedFile.created_at),
    updated_at: toISOStringSafe(updatedFile.updated_at),
    deleted_at: updatedFile.deleted_at
      ? toISOStringSafe(updatedFile.deleted_at)
      : null,
    display_order: updatedFile.display_order,
    article_id: updatedFile.article_id,
    file_name: updatedFile.file_name,
    file_type: updatedFile.file_type,
    file_size: updatedFile.file_size,
    download_url: updatedFile.download_url,
  };
}
