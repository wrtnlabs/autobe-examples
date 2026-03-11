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
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate article exists and is not deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (article === null || article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  // Validate file attachment exists and belongs to the article
  const file = await MyGlobal.prisma.discussion_board_article_files.findUnique({
    where: { id: props.fileId },
  });
  if (file === null || file.deleted_at !== null) {
    throw new HttpException("File attachment not found", 404);
  }
  if (file.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "File does not belong to the specified article",
      404,
    );
  }
  // Check authorization: member must be the article owner
  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete the file attachment
  await MyGlobal.prisma.discussion_board_article_files.update({
    where: { id: props.fileId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
