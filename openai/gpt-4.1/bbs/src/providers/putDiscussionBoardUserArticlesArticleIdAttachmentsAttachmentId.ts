import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // Step 1: Lookup article (ensure exists and not deleted)
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // Step 2: Lookup attachment (ensure belongs to article and is not deleted)
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findFirst({
      where: {
        id: props.attachmentId,
        article_id: props.articleId,
        deleted_at: null,
      },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }

  // Step 3: Permission check (user is article owner or admin)
  const isOwner = article.user_id === props.user.id;
  let isAdmin = false;
  if (!isOwner) {
    const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
      where: {
        id: props.user.id,
        deleted_at: null,
      },
    });
    isAdmin = Boolean(admin);
  }
  if (!isOwner && !isAdmin) {
    throw new HttpException(
      "Forbidden: Not authorized to edit this attachment",
      403,
    );
  }

  // Step 4: Business validation - enforce file size, type, name, uri if present
  if (
    props.body.file_name !== undefined &&
    (props.body.file_name.length < 1 || props.body.file_name.length > 255)
  ) {
    throw new HttpException("File name must be 1 to 255 characters", 400);
  }
  if (
    props.body.mime_type !== undefined &&
    (props.body.mime_type.length < 3 || props.body.mime_type.length > 63)
  ) {
    throw new HttpException("Mime type must be 3 to 63 characters", 400);
  }
  if (
    props.body.file_size !== undefined &&
    (props.body.file_size < 1 || props.body.file_size > 10485760)
  ) {
    throw new HttpException(
      "File size must be between 1 and 10485760 bytes",
      400,
    );
  }
  if (props.body.file_uri !== undefined && props.body.file_uri.length < 1) {
    throw new HttpException("File uri must be a non-empty string", 400);
  }

  // Step 5: Update the attachment with provided fields
  const updated =
    await MyGlobal.prisma.discussion_board_article_attachments.update({
      where: {
        id: props.attachmentId,
      },
      data: {
        ...(props.body.file_name !== undefined
          ? { file_name: props.body.file_name }
          : {}),
        ...(props.body.mime_type !== undefined
          ? { mime_type: props.body.mime_type }
          : {}),
        ...(props.body.file_size !== undefined
          ? { file_size: props.body.file_size }
          : {}),
        ...(props.body.file_uri !== undefined
          ? { file_uri: props.body.file_uri }
          : {}),
        ...(props.body.deleted_at !== undefined
          ? { deleted_at: props.body.deleted_at }
          : {}),
      },
    });

  // Step 6: Return updated metadata (no Date objects)
  return {
    id: updated.id,
    article_id: updated.article_id,
    file_name: updated.file_name,
    mime_type: updated.mime_type,
    file_size: updated.file_size,
    file_uri: updated.file_uri,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at:
      typeof updated.deleted_at === "string"
        ? updated.deleted_at
        : updated.deleted_at
          ? toISOStringSafe(updated.deleted_at)
          : undefined,
  };
}
