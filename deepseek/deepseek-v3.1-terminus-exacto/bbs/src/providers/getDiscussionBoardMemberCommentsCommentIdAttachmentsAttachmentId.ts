import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getDiscussionBoardMemberCommentsCommentIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentAttachment> {
  // Find the attachment with its relationships
  const attachment =
    await MyGlobal.prisma.discussion_board_comment_attachments.findFirst({
      where: {
        id: props.attachmentId,
        discussion_board_comment_id: props.commentId,
        deleted_at: null,
      },
      include: {
        comment: {
          include: {
            author: {
              select: {
                id: true,
                display_name: true,
                username: true,
              },
            },
            post: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        member: {
          select: {
            id: true,
            display_name: true,
            username: true,
          },
        },
        memberSession: {
          select: {
            id: true,
            ip: true,
            href: true,
            referrer: true,
            created_at: true,
            updated_at: true,
            expired_at: true,
            deleted_at: true,
          },
        },
      },
    });

  if (!attachment) {
    throw new HttpException(
      "Attachment not found or does not belong to the specified comment",
      404,
    );
  }

  // Check if attachment upload is completed
  if (attachment.upload_status !== "completed") {
    throw new HttpException("Attachment is not available for download", 400);
  }

  // Build the comment summary with proper type conversion
  const commentSummary: IDiscussionBoardComment.ISummary = {
    id: attachment.comment.id,
    content: attachment.comment.content,
    status: attachment.comment.status,
    thread_level: attachment.comment.thread_level,
    created_at: toISOStringSafe(attachment.comment.created_at),
    author: {
      id: attachment.comment.author.id,
      type: "member",
      name:
        attachment.comment.author.display_name ||
        attachment.comment.author.username,
    },
    post: {
      id: attachment.comment.post.id,
      type: "post",
      title: attachment.comment.post.title,
    },
  };

  // Build the member summary
  const memberSummary: IDiscussionBoardMember.ISummary = {
    id: attachment.member.id,
    type: "member",
    name: attachment.member.display_name || attachment.member.username,
  };

  // Build the member session summary if available
  const memberSessionSummary = attachment.memberSession
    ? {
        id: attachment.memberSession.id,
        ip: attachment.memberSession.ip,
        href: attachment.memberSession.href,
        referrer: attachment.memberSession.referrer,
        created_at: toISOStringSafe(attachment.memberSession.created_at),
        updated_at: toISOStringSafe(attachment.memberSession.updated_at),
        expired_at: attachment.memberSession.expired_at
          ? toISOStringSafe(attachment.memberSession.expired_at)
          : undefined,
        deleted_at: attachment.memberSession.deleted_at
          ? toISOStringSafe(attachment.memberSession.deleted_at)
          : undefined,
      }
    : undefined;

  return {
    id: attachment.id,
    file_name: attachment.file_name,
    file_type: attachment.file_type,
    file_size: attachment.file_size,
    storage_path: attachment.storage_path,
    upload_status: attachment.upload_status,
    security_scan_result: attachment.security_scan_result ?? undefined,
    description: attachment.description ?? undefined,
    download_count: attachment.download_count,
    created_at: toISOStringSafe(attachment.created_at),
    updated_at: toISOStringSafe(attachment.updated_at),
    deleted_at: attachment.deleted_at
      ? toISOStringSafe(attachment.deleted_at)
      : undefined,
    comment: commentSummary,
    member: memberSummary,
    memberSession: memberSessionSummary,
  };
}
