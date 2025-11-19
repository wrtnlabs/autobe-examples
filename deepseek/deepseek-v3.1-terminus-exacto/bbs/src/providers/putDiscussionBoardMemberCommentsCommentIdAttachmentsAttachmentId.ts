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

export async function putDiscussionBoardMemberCommentsCommentIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentAttachment.IUpdate;
}): Promise<IDiscussionBoardCommentAttachment> {
  // First, verify the attachment exists and belongs to the specified comment
  const existingAttachment =
    await MyGlobal.prisma.discussion_board_comment_attachments.findFirst({
      where: {
        id: props.attachmentId,
        discussion_board_comment_id: props.commentId,
        deleted_at: null,
      },
      include: {
        comment: {
          include: {
            author: true,
            post: true,
          },
        },
        member: true,
        memberSession: true,
      },
    });

  if (!existingAttachment) {
    throw new HttpException(
      "Attachment not found or does not belong to the specified comment",
      404,
    );
  }

  // Verify the requesting member is the original uploader
  if (existingAttachment.discussion_board_member_id !== props.member.id) {
    throw new HttpException(
      "You do not have permission to update this attachment",
      403,
    );
  }

  // Perform the update with inline parameters
  const updated =
    await MyGlobal.prisma.discussion_board_comment_attachments.update({
      where: {
        id: props.attachmentId,
      },
      data: {
        file_name:
          props.body.file_name !== undefined ? props.body.file_name : undefined,
        description:
          props.body.description !== undefined
            ? props.body.description
            : undefined,
        upload_status:
          props.body.upload_status !== undefined
            ? props.body.upload_status
            : undefined,
        security_scan_result:
          props.body.security_scan_result !== undefined
            ? props.body.security_scan_result
            : undefined,
        download_count:
          props.body.download_count !== undefined
            ? props.body.download_count
            : undefined,
        updated_at: toISOStringSafe(new Date()),
      },
      include: {
        comment: {
          include: {
            author: true,
            post: true,
          },
        },
        member: true,
        memberSession: true,
      },
    });

  // Transform and return the result
  return {
    id: updated.id,
    file_name: updated.file_name,
    file_type: updated.file_type,
    file_size: updated.file_size,
    storage_path: updated.storage_path,
    upload_status: updated.upload_status,
    security_scan_result:
      updated.security_scan_result === null
        ? undefined
        : updated.security_scan_result,
    description: updated.description === null ? undefined : updated.description,
    download_count: updated.download_count,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
    comment: {
      id: updated.comment.id,
      content: updated.comment.content,
      status: updated.comment.status,
      thread_level: updated.comment.thread_level,
      created_at: toISOStringSafe(updated.comment.created_at),
      author: {
        id: updated.comment.author.id,
        type: "member",
        name: updated.comment.author.display_name || "Unknown Member",
      },
      post: {
        id: updated.comment.post.id,
        type: "post",
        title: updated.comment.post.title,
      },
    },
    member: {
      id: updated.member.id,
      type: "member",
      name: updated.member.display_name || "Unknown Member",
    },
    memberSession: updated.memberSession
      ? {
          id: updated.memberSession.id,
          ip: updated.memberSession.ip,
          href: updated.memberSession.href,
          referrer: updated.memberSession.referrer,
          created_at: toISOStringSafe(updated.memberSession.created_at),
          updated_at: toISOStringSafe(updated.memberSession.updated_at),
          expired_at:
            updated.memberSession.expired_at === null
              ? undefined
              : toISOStringSafe(updated.memberSession.expired_at),
          deleted_at:
            updated.memberSession.deleted_at === null
              ? undefined
              : toISOStringSafe(updated.memberSession.deleted_at),
        }
      : undefined,
  };
}
