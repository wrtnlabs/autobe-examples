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

export async function deleteDiscussionBoardAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify article exists and is not already deleted
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  // Perform cascade soft delete in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft delete the article
    await tx.discussion_board_articles.update({
      where: { id: props.articleId },
      data: { deleted_at: new Date() },
    });
    // Soft delete all comments on the article
    await tx.discussion_board_comments.updateMany({
      where: {
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
      data: { deleted_at: new Date() },
    });
    // Hard delete attachments (no deleted_at column in attachments table)
    await tx.discussion_board_article_attachments.deleteMany({
      where: { discussion_board_article_id: props.articleId },
    });
  });
}
