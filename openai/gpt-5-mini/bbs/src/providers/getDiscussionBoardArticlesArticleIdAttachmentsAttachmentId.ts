import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function getDiscussionBoardArticlesArticleIdAttachmentsAttachmentId(props: {
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAttachment> {
  const { articleId, attachmentId } = props;

  try {
    const attachment =
      await MyGlobal.prisma.discussion_board_attachments.findUnique({
        where: { id: attachmentId },
        include: { article: true, uploader: true },
      });

    if (!attachment) throw new HttpException("Not Found", 404);

    // Ensure the attachment belongs to the requested article
    if (attachment.discussion_board_article_id !== articleId) {
      throw new HttpException("Not Found", 404);
    }

    // Visibility enforcement: treat deleted or non-published as not found
    if (attachment.deleted_at !== null)
      throw new HttpException("Not Found", 404);
    if (!attachment.article) throw new HttpException("Not Found", 404);
    if (attachment.article.deleted_at !== null)
      throw new HttpException("Not Found", 404);
    if (attachment.article.state !== "published")
      throw new HttpException("Not Found", 404);

    // Map uploader summary when available
    const uploader = attachment.uploader
      ? {
          id: attachment.uploader.id as string & tags.Format<"uuid">,
          username: attachment.uploader.username,
          display_name: attachment.uploader.display_name ?? null,
          created_at: toISOStringSafe(attachment.uploader.created_at),
        }
      : undefined;

    // Provide a safe, implementation-defined download URL (avoid non-existent env keys)
    const downloadUrl = `/attachments/download/${attachment.id}` as string &
      tags.Format<"uri">;

    const result = {
      id: attachment.id as string & tags.Format<"uuid">,
      article_id: attachment.discussion_board_article_id as string &
        tags.Format<"uuid">,
      original_filename: attachment.original_filename,
      storage_key: attachment.storage_key as string & tags.Format<"uri">,
      mime_type: attachment.mime_type,
      size: attachment.size,
      is_image: attachment.is_image,
      created_at: toISOStringSafe(attachment.created_at),
      deleted_at: attachment.deleted_at
        ? toISOStringSafe(attachment.deleted_at)
        : null,
      uploader,
      downloadUrl,
    };

    return result;
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new HttpException("Internal Server Error", 500);
  }
}
