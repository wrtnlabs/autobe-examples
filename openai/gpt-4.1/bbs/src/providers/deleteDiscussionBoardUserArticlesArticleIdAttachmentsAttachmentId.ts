import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteDiscussionBoardUserArticlesArticleIdAttachmentsAttachmentId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleAttachment> {
  // 1. Fetch attachment that matches attachmentId, belongs to articleId, and is not soft-deleted
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findFirst({
      where: {
        id: props.attachmentId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found or already deleted.", 404);
  }
  // 2. Fetch article and check ownership
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  if (!article || article.author_user_id !== props.user.id) {
    throw new HttpException(
      "You are not authorized to delete attachments from this article.",
      403,
    );
  }
  // 3. Soft-delete attachment (set deleted_at)
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.discussion_board_article_attachments.update({
      where: { id: props.attachmentId },
      data: { deleted_at: now },
    });
  // 4. Return IDiscussionBoardArticleAttachment object, convert Dates properly
  return {
    id: updated.id,
    discussion_board_article_id: updated.discussion_board_article_id,
    filename: updated.filename,
    kind: updated.kind,
    mimetype: updated.mimetype,
    filesize: updated.filesize,
    virus_scanned: updated.virus_scanned,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
