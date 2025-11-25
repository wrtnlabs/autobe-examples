import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // Fetch the attachment record, enforce it belongs to the article
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findUnique({
      where: {
        id: props.attachmentId,
      },
    });

  if (!attachment || attachment.article_id !== props.articleId) {
    throw new HttpException("Attachment not found for specified article", 404);
  }

  // Validate file size
  if (
    props.body.file_size !== undefined &&
    (props.body.file_size < 1 || props.body.file_size > 10485760)
  ) {
    throw new HttpException("File size must be between 1 byte and 10MB", 400);
  }

  // Validate file name length
  if (
    props.body.file_name !== undefined &&
    (props.body.file_name.length < 1 || props.body.file_name.length > 255)
  ) {
    throw new HttpException("File name length must be 1-255 characters", 400);
  }

  // Validate MIME type length
  if (
    props.body.mime_type !== undefined &&
    (props.body.mime_type.length < 3 || props.body.mime_type.length > 63)
  ) {
    throw new HttpException("MIME type length must be 3-63 characters", 400);
  }

  // If file_uri present, validate it is a URI (simple check for this context)
  if (
    props.body.file_uri !== undefined &&
    !(
      props.body.file_uri.startsWith("http://") ||
      props.body.file_uri.startsWith("https://") ||
      props.body.file_uri.startsWith("s3://") ||
      props.body.file_uri.startsWith("file://")
    )
  ) {
    throw new HttpException("Invalid file URI format", 400);
  }

  // Compose update data: only patch fields that are present
  const updateData: Record<string, unknown> = {};
  if (props.body.file_name !== undefined)
    updateData.file_name = props.body.file_name;
  if (props.body.mime_type !== undefined)
    updateData.mime_type = props.body.mime_type;
  if (props.body.file_size !== undefined)
    updateData.file_size = props.body.file_size;
  if (props.body.file_uri !== undefined)
    updateData.file_uri = props.body.file_uri;
  if (props.body.deleted_at !== undefined)
    updateData.deleted_at =
      props.body.deleted_at === null ? null : props.body.deleted_at;

  if (Object.keys(updateData).length === 0) {
    throw new HttpException("No fields provided for update.", 400);
  }

  const updated =
    await MyGlobal.prisma.discussion_board_article_attachments.update({
      where: { id: props.attachmentId },
      data: updateData,
    });

  return {
    id: updated.id,
    article_id: updated.article_id,
    file_name: updated.file_name,
    mime_type: updated.mime_type,
    file_size: updated.file_size,
    file_uri: updated.file_uri,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
