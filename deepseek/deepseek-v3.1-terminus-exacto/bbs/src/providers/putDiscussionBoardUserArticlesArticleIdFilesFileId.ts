import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardUserArticlesArticleIdFilesFileId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IUpdate;
}): Promise<IDiscussionBoardArticleFile> {
  // First verify the article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId, deleted_at: null },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Verify the file exists and belongs to the article
  const file = await MyGlobal.prisma.discussion_board_article_files.findUnique({
    where: {
      id: props.fileId,
      discussion_board_article_id: props.articleId,
      deleted_at: null,
    },
    ...DiscussionBoardArticleFileTransformer.select(),
  });
  if (!file) {
    throw new HttpException(
      "File not found or does not belong to the specified article",
      404,
    );
  }
  // Authorization check: user must be the uploader or an administrator
  const isUploader = file.uploaded_by && file.uploaded_by === props.user.id;
  if (!isUploader) {
    // Check if user is administrator
    const adminRecord = await MyGlobal.prisma.discussion_board_admins.findFirst(
      {
        where: {
          id: props.user.id,
          deleted_at: null,
        },
      },
    );
    if (!adminRecord) {
      throw new HttpException(
        "You do not have permission to update this file",
        403,
      );
    }
  }
  // Update the file metadata
  const updated = await MyGlobal.prisma.discussion_board_article_files.update({
    where: { id: props.fileId },
    data: {
      description: props.body.description ?? null,
      updated_at: toISOStringSafe(new Date(Date.now())),
    },
    ...DiscussionBoardArticleFileTransformer.select(),
  });
  return await DiscussionBoardArticleFileTransformer.transform(updated);
}
