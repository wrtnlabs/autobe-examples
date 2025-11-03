import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberArticlesArticleIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, articleId, attachmentId } = props;

  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUnique({
      where: { id: attachmentId },
      include: {
        article: { select: { id: true, discussion_board_member_id: true } },
        uploader: { select: { id: true } },
      },
    });

  if (!attachment) {
    throw new HttpException("Not Found", 404);
  }

  if (attachment.discussion_board_article_id !== articleId) {
    throw new HttpException(
      "Attachment does not belong to the specified article",
      409,
    );
  }

  const isUploader =
    attachment.discussion_board_member_id !== null &&
    attachment.discussion_board_member_id === member.id;
  const isArticleAuthor =
    !!attachment.article &&
    attachment.article.discussion_board_member_id === member.id;

  if (!isUploader && !isArticleAuthor) {
    throw new HttpException(
      "Unauthorized: You are not allowed to delete this attachment",
      403,
    );
  }

  // Idempotent: already soft-deleted
  if (attachment.deleted_at) return;

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.discussion_board_attachments.update({
    where: { id: attachmentId },
    data: { deleted_at: now },
  });

  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_type: "attachment.deleted",
      event_timestamp: now,
      resource_type: "attachment",
      resource_id: attachmentId,
      actor_type: "member",
      actor_id: member.id,
      metadata: JSON.stringify({
        article_id: articleId,
        uploader_id: attachment.discussion_board_member_id ?? null,
        original_filename: attachment.original_filename,
        storage_key: attachment.storage_key,
      }),
      created_at: now,
      updated_at: now,
    },
  });

  return;
}
