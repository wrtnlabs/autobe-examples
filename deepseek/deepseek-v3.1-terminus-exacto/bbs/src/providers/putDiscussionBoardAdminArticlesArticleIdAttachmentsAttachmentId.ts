import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAttachmentTransformer } from "../transformers/DiscussionBoardAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminArticlesArticleIdAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.IUpdate;
}): Promise<IDiscussionBoardAttachment> {
  // Verify article exists and is not deleted
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  // Verify attachment exists and belongs to article and is not deleted
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUniqueOrThrow({
      where: {
        id: props.attachmentId,
        article_id: props.articleId,
        deleted_at: null,
      },
    });
  // Validate MIME type format if provided
  if (props.body.mime_type !== undefined) {
    const mimeTypeRegex = /^[a-zA-Z0-9]+\/[a-zA-Z0-9.+_-]+$/;
    if (!mimeTypeRegex.test(props.body.mime_type)) {
      throw new HttpException("Invalid MIME type format", 400);
    }
  }
  // Validate filetype if provided (basic alphanumeric with dots)
  if (props.body.filetype !== undefined) {
    const filetypeRegex = /^[a-zA-Z0-9.]+$/;
    if (!filetypeRegex.test(props.body.filetype)) {
      throw new HttpException("Invalid filetype format", 400);
    }
  }
  // Check filename uniqueness within the article if filename is being updated
  if (props.body.filename !== undefined) {
    const existingFilename =
      await MyGlobal.prisma.discussion_board_attachments.findFirst({
        where: {
          article_id: props.articleId,
          filename: props.body.filename,
          id: { not: props.attachmentId },
          deleted_at: null,
        },
      });
    if (existingFilename !== null) {
      throw new HttpException(
        "Filename must be unique within the article",
        400,
      );
    }
  }
  // Build update data object with only allowed fields
  const updateData: Prisma.discussion_board_attachmentsUpdateInput = {};
  if (props.body.filename !== undefined) {
    updateData.filename = props.body.filename;
  }
  if (props.body.filetype !== undefined) {
    updateData.filetype = props.body.filetype;
  }
  if (props.body.mime_type !== undefined) {
    updateData.mime_type = props.body.mime_type;
  }
  // Add updated_at timestamp - Prisma accepts Date object for DateTime fields
  updateData.updated_at = new Date();
  // Perform update
  await MyGlobal.prisma.discussion_board_attachments.update({
    where: { id: props.attachmentId },
    data: updateData,
  });
  // Retrieve updated attachment with transformer select
  const updated =
    await MyGlobal.prisma.discussion_board_attachments.findUniqueOrThrow({
      where: { id: props.attachmentId },
      ...DiscussionBoardAttachmentTransformer.select(),
    });
  // Transform and return
  return await DiscussionBoardAttachmentTransformer.transform(updated);
}
