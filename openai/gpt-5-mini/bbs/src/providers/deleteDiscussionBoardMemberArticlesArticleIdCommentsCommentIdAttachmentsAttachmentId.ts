import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberArticlesArticleIdCommentsCommentIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, articleId, commentId, attachmentId } = props;

  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
    select: { id: true, discussion_board_member_id: true },
  });
  if (!article) throw new HttpException("Not Found", 404);

  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: commentId },
    select: { id: true, discussion_board_article_id: true },
  });
  if (!comment || comment.discussion_board_article_id !== articleId) {
    throw new HttpException("Not Found", 404);
  }

  const attachment =
    await MyGlobal.prisma.discussion_board_comment_attachments.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        discussion_board_comment_id: true,
        discussion_board_uploaded_by_id: true,
        storage_key: true,
        original_filename: true,
        quarantined: true,
        created_at: true,
      },
    });
  if (!attachment || attachment.discussion_board_comment_id !== commentId) {
    throw new HttpException("Not Found", 404);
  }

  const isUploader = member.id === attachment.discussion_board_uploaded_by_id;
  const isArticleAuthor = member.id === article.discussion_board_member_id;

  let isModerator = false;
  const memberRecord = await MyGlobal.prisma.discussion_board_member.findUnique(
    {
      where: { id: member.id },
      select: { role: true },
    },
  );
  if (memberRecord && memberRecord.role === "moderator") isModerator = true;

  if (!isUploader && !isArticleAuthor && !isModerator) {
    throw new HttpException("Unauthorized: insufficient permission", 403);
  }

  const auditId = v4() as string & tags.Format<"uuid">;
  const occurred_at = toISOStringSafe(new Date());
  const basePayload = {
    action: "delete_comment_attachment",
    actor_member_id: member.id,
    article_id: articleId,
    comment_id: commentId,
    attachment_id: attachmentId,
    storage_key: attachment.storage_key,
    original_filename: attachment.original_filename,
    quarantined: attachment.quarantined === true,
    storage_deleted: false,
  };

  // Delete DB row and create audit entry in a single transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_comment_attachments.delete({
      where: { id: attachmentId },
    }),
    MyGlobal.prisma.discussion_board_moderation_audit.create({
      data: {
        id: auditId,
        event_type: "attachment.deleted",
        event_payload: JSON.stringify(basePayload),
        occurred_at: occurred_at,
      },
    }),
  ]);

  // Access optional storage client in a type-safe way without assuming property exists on MyGlobal
  const storageClient = (
    MyGlobal as unknown as {
      storage?: {
        delete?: (key: string) => Promise<void>;
        deleteObject?: (key: string) => Promise<void>;
      };
    }
  ).storage;

  try {
    if (storageClient && typeof storageClient.delete === "function") {
      await storageClient.delete(attachment.storage_key);
    } else if (
      storageClient &&
      typeof storageClient.deleteObject === "function"
    ) {
      await storageClient.deleteObject(attachment.storage_key);
    } else {
      // Storage client not available - record a failure audit and surface error
      const failureAuditId = v4() as string & tags.Format<"uuid">;
      const failurePayload = {
        ...basePayload,
        storage_deleted: false,
        storage_error: "storage client not available",
      };
      await MyGlobal.prisma.discussion_board_moderation_audit.create({
        data: {
          id: failureAuditId,
          event_type: "attachment.delete_storage_failed",
          event_payload: JSON.stringify(failurePayload),
          occurred_at: toISOStringSafe(new Date()),
        },
      });

      throw new HttpException("Storage deletion failed", 500);
    }

    // mark audit payload storage_deleted = true
    const updatedPayload = { ...basePayload, storage_deleted: true };
    await MyGlobal.prisma.discussion_board_moderation_audit.update({
      where: { id: auditId },
      data: { event_payload: JSON.stringify(updatedPayload) },
    });

    return;
  } catch (err) {
    const failureAuditId = v4() as string & tags.Format<"uuid">;
    const storageError = String(
      (err as unknown as { message?: unknown }).message ?? err,
    );
    const failurePayload = {
      ...basePayload,
      storage_deleted: false,
      storage_error: storageError,
    };
    await MyGlobal.prisma.discussion_board_moderation_audit.create({
      data: {
        id: failureAuditId,
        event_type: "attachment.delete_storage_failed",
        event_payload: JSON.stringify(failurePayload),
        occurred_at: toISOStringSafe(new Date()),
      },
    });

    throw new HttpException("Storage deletion failed", 500);
  }
}
