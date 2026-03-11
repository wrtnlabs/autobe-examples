import { IDiscussionBoardImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardImageAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardImageAttachmentTransformer } from "../transformers/DiscussionBoardImageAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminArticlesArticleIdAttachmentsAttachmentIdImageMetadata(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardImageAttachment.IUpdate;
}): Promise<IDiscussionBoardImageAttachment> {
  // First, validate article exists
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  // Validate attachment exists and belongs to this article
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUniqueOrThrow({
      where: {
        id: props.attachmentId,
        article_id: props.articleId, // Ensure attachment belongs to article
      },
    });
  // Check if image metadata already exists for this attachment
  const existingImageMetadata =
    await MyGlobal.prisma.discussion_board_image_attachments.findUnique({
      where: { discussion_board_attachment_id: props.attachmentId },
      ...DiscussionBoardImageAttachmentTransformer.select(),
    });
  let imageMetadata;
  const now = new Date();
  if (existingImageMetadata) {
    // Update existing image metadata
    const updateData: Prisma.discussion_board_image_attachmentsUpdateInput = {
      updated_at: now,
    };
    if (props.body.width !== undefined) {
      updateData.width = props.body.width;
    }
    if (props.body.height !== undefined) {
      updateData.height = props.body.height;
    }
    if ("altText" in props.body) {
      updateData.alt_text = props.body.altText ?? null;
    }
    await MyGlobal.prisma.discussion_board_image_attachments.update({
      where: { id: existingImageMetadata.id },
      data: updateData,
    });
    // Fetch updated record with transformer select
    imageMetadata =
      await MyGlobal.prisma.discussion_board_image_attachments.findUniqueOrThrow(
        {
          where: { id: existingImageMetadata.id },
          ...DiscussionBoardImageAttachmentTransformer.select(),
        },
      );
  } else {
    // Create new image metadata
    // Set defaults for required fields if not provided in update
    const width = props.body.width ?? 1; // Default minimum
    const height = props.body.height ?? 1; // Default minimum
    const altText =
      "altText" in props.body ? (props.body.altText ?? null) : null;
    imageMetadata =
      await MyGlobal.prisma.discussion_board_image_attachments.create({
        data: {
          id: v4(),
          discussion_board_attachment_id: props.attachmentId,
          width,
          height,
          alt_text: altText,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        ...DiscussionBoardImageAttachmentTransformer.select(),
      });
  }
  return await DiscussionBoardImageAttachmentTransformer.transform(
    imageMetadata,
  );
}
