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

export async function deleteDiscussionBoardRegisteredUserArticlesArticleIdFilesFileId(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Retrieve the article with owner id
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true, registered_user_id: true },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Verify ownership or admin privileges
  if (article.registered_user_id !== props.registeredUser.id) {
    const admin =
      await MyGlobal.prisma.discussion_board_administrators.findFirst({
        where: {
          registered_user_id: props.registeredUser.id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!admin) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Verify file existence and linkage to article
  const file = await MyGlobal.prisma.discussion_board_article_files.findUnique({
    where: { id: props.fileId },
    select: { id: true, article_id: true },
  });
  if (!file || file.article_id !== props.articleId) {
    throw new HttpException("File not found", 404);
  }
  // Delete the file record, cascading handled by DB
  await MyGlobal.prisma.discussion_board_article_files.delete({
    where: { id: props.fileId },
  });
}
