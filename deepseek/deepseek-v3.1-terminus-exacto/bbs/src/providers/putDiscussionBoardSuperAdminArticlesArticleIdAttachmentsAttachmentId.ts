import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putDiscussionBoardSuperAdminArticlesArticleIdAttachmentsAttachmentId(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.IUpdate;
}): Promise<IDiscussionBoardAttachment> {
  // 1. Verify article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId, deleted_at: null },
  });
  // 2. Verify attachment exists and belongs to the specified article
  const existingAttachment =
    await MyGlobal.prisma.discussion_board_attachments.findUniqueOrThrow({
      where: {
        id: props.attachmentId,
        article_id: props.articleId,
        deleted_at: null,
      },
    });
  // 3. If filename is being updated, check uniqueness within article
  if (
    props.body.filename !== undefined &&
    props.body.filename !== existingAttachment.filename
  ) {
    const conflictingAttachment =
      await MyGlobal.prisma.discussion_board_attachments.findFirst({
        where: {
          article_id: props.articleId,
          filename: props.body.filename,
          deleted_at: null,
          NOT: { id: props.attachmentId },
        },
      });
    if (conflictingAttachment !== null) {
      throw new HttpException(
        "Filename must be unique within the article",
        400,
      );
    }
  }
  // 4. Prepare update data
  const updateData: Prisma.discussion_board_attachmentsUpdateInput = {
    ...(props.body.filename !== undefined && { filename: props.body.filename }),
    ...(props.body.filetype !== undefined && { filetype: props.body.filetype }),
    ...(props.body.mime_type !== undefined && {
      mime_type: props.body.mime_type,
    }),
    updated_at: new Date(),
  };
  // 5. Perform update
  await MyGlobal.prisma.discussion_board_attachments.update({
    where: { id: props.attachmentId },
    data: updateData,
  });
  // 6. Retrieve updated attachment with full relation data
  const updatedAttachment =
    await MyGlobal.prisma.discussion_board_attachments.findUniqueOrThrow({
      where: { id: props.attachmentId },
      select: {
        id: true,
        filename: true,
        filetype: true,
        mime_type: true,
        size_bytes: true,
        storage_path: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: {
          select: { id: true },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
        snapshots: {
          select: { id: true },
        } satisfies Prisma.discussion_board_attachment_snapshotsFindManyArgs,
        imageMetadatum: {
          select: { id: true },
        } satisfies Prisma.discussion_board_image_attachmentsFindManyArgs,
        downloads: {
          select: { id: true },
        } satisfies Prisma.discussion_board_attachment_downloadsFindManyArgs,
        categoryMappings: {
          select: { id: true },
        } satisfies Prisma.discussion_board_attachment_category_mappingsFindManyArgs,
        thumbnails: {
          select: { id: true },
        } satisfies Prisma.discussion_board_attachment_thumbnailsFindManyArgs,
      },
    });
  // 7. Transform and return
  return {
    id: updatedAttachment.id,
    filename: updatedAttachment.filename,
    filetype: updatedAttachment.filetype,
    mime_type: updatedAttachment.mime_type,
    size_bytes: updatedAttachment.size_bytes,
    storage_path: updatedAttachment.storage_path,
    created_at: updatedAttachment.created_at.toISOString(),
    updated_at: updatedAttachment.updated_at.toISOString(),
    deleted_at: updatedAttachment.deleted_at?.toISOString() ?? null,
    article_id: updatedAttachment.article.id,
  };
}
