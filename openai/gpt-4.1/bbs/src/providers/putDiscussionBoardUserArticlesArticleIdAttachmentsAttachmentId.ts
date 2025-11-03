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

export async function putDiscussionBoardUserArticlesArticleIdAttachmentsAttachmentId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleAttachment.IUpdate;
}): Promise<IDiscussionBoardArticleAttachment> {
  // Fetch the attachment, ensure it belongs to the target article and is not deleted
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findFirst({
      where: {
        id: props.attachmentId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
      include: { article: { select: { author_user_id: true } } },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found or already deleted", 404);
  }
  // Only the author can update (admins not handled in this endpoint)
  if (attachment.article.author_user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to update this attachment",
      403,
    );
  }
  // Prepare update fields (PATCH semantics)
  const updateFields = {
    ...(props.body.filename !== undefined && { filename: props.body.filename }),
    ...(props.body.kind !== undefined && { kind: props.body.kind }),
    ...(props.body.mimetype !== undefined && { mimetype: props.body.mimetype }),
    ...(props.body.filesize !== undefined && { filesize: props.body.filesize }),
  };
  if (Object.keys(updateFields).length === 0) {
    // nothing to update
    return {
      id: attachment.id,
      discussion_board_article_id: attachment.discussion_board_article_id,
      filename: attachment.filename,
      kind: attachment.kind,
      mimetype: attachment.mimetype,
      filesize: attachment.filesize,
      virus_scanned: attachment.virus_scanned,
      created_at: toISOStringSafe(attachment.created_at),
      deleted_at: attachment.deleted_at
        ? toISOStringSafe(attachment.deleted_at)
        : undefined,
    };
  }
  const updated =
    await MyGlobal.prisma.discussion_board_article_attachments.update({
      where: { id: props.attachmentId },
      data: updateFields,
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
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
