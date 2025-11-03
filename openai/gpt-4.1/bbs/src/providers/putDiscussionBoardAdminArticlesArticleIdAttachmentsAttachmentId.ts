import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminArticlesArticleIdAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleAttachment.IUpdate;
}): Promise<IDiscussionBoardArticleAttachment> {
  const { articleId, attachmentId, body } = props;
  // Ensure the attachment exists, is linked to the correct article, and is not soft deleted
  const orig =
    await MyGlobal.prisma.discussion_board_article_attachments.findFirst({
      where: {
        id: attachmentId,
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
    });
  if (!orig)
    throw new HttpException("Attachment not found or already deleted", 404);

  const updated =
    await MyGlobal.prisma.discussion_board_article_attachments.update({
      where: { id: attachmentId },
      data: {
        filename: body.filename ?? undefined,
        kind: body.kind ?? undefined,
        mimetype: body.mimetype ?? undefined,
        filesize: body.filesize ?? undefined,
      },
    });

  return {
    id: updated.id,
    discussion_board_article_id: updated.discussion_board_article_id,
    filename: updated.filename,
    kind: updated.kind,
    mimetype: updated.mimetype,
    filesize: updated.filesize,
    virus_scanned: updated.virus_scanned,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
