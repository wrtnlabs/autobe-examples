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

export async function deleteDiscussionBoardUserArticlesArticleIdFilesFileId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleFile> {
  // First verify article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    select: {
      id: true,
      discussion_board_user_id: true,
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Check ownership - user must be article owner
  // TODO: Add admin privilege check when admin auth is available
  if (article.discussion_board_user_id !== props.user.id) {
    throw new HttpException(
      "You can only delete files from your own articles",
      403,
    );
  }
  // Verify file exists and belongs to specified article
  const file = await MyGlobal.prisma.discussion_board_article_files.findUnique({
    where: {
      id: props.fileId,
      deleted_at: null,
    },
  });
  if (!file) {
    throw new HttpException("File attachment not found", 404);
  }
  if (file.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "File attachment does not belong to the specified article",
      400,
    );
  }
  // Perform soft deletion with current timestamp
  const deletedFile =
    await MyGlobal.prisma.discussion_board_article_files.update({
      where: { id: props.fileId },
      data: {
        deleted_at: toISOStringSafe(new Date(Date.now())),
      },
      ...DiscussionBoardArticleFileTransformer.select(),
    });
  return await DiscussionBoardArticleFileTransformer.transform(deletedFile);
}
