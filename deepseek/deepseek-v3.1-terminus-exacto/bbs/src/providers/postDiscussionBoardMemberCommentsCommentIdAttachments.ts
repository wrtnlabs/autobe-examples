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

export async function postDiscussionBoardMemberCommentsCommentIdAttachments(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentAttachment.ICreate;
}): Promise<IDiscussionBoardCommentAttachment> {
  // Verify the comment exists and is accessible
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      deleted_at: null,
      author: {
        id: props.member.id,
        deleted_at: null,
      },
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!comment) {
    throw new HttpException(
      "Comment not found or you don't have permission to add attachments to this comment",
      404,
    );
  }

  // Validate file size limits (example: 10MB max)
  if (props.body.file_size > 10 * 1024 * 1024) {
    throw new HttpException(
      "File size exceeds maximum allowed limit of 10MB",
      400,
    );
  }

  // Validate allowed file types
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!allowedTypes.includes(props.body.file_type)) {
    throw new HttpException(
      `File type ${props.body.file_type} is not supported. Allowed types: ${allowedTypes.join(", ")}`,
      400,
    );
  }

  const currentTime = toISOStringSafe(new Date());

  // Create the attachment record
  const attachment =
    await MyGlobal.prisma.discussion_board_comment_attachments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_comment_id: props.commentId,
        discussion_board_member_id: props.member.id,
        discussion_board_member_session_id: props.member.session_id,
        file_name: props.body.file_name,
        file_type: props.body.file_type,
        file_size: props.body.file_size,
        storage_path: props.body.storage_path,
        description: props.body.description ?? null,
        upload_status: "pending",
        security_scan_result: "pending",
        download_count: 0,
        created_at: currentTime,
        updated_at: currentTime,
        deleted_at: null,
      },
      include: {
        comment: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                display_name: true,
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
            username: true,
            display_name: true,
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

  // Transform to match DTO structure with proper null/undefined handling
  return {
    id: attachment.id,
    file_name: attachment.file_name,
    file_type: attachment.file_type,
    file_size: attachment.file_size,
    storage_path: attachment.storage_path,
    upload_status: attachment.upload_status,
    security_scan_result:
      attachment.security_scan_result === null
        ? undefined
        : attachment.security_scan_result,
    description:
      attachment.description === null ? undefined : attachment.description,
    download_count: attachment.download_count,
    created_at: toISOStringSafe(attachment.created_at),
    updated_at: toISOStringSafe(attachment.updated_at),
    deleted_at: attachment.deleted_at
      ? toISOStringSafe(attachment.deleted_at)
      : undefined,
    comment: {
      id: attachment.comment.id,
      content: attachment.comment.content,
      status: attachment.comment.status,
      thread_level: attachment.comment.thread_level,
      created_at: toISOStringSafe(attachment.comment.created_at),
      author: {
        id: attachment.comment.author.id,
        type: "member",
        name:
          attachment.comment.author.display_name ??
          attachment.comment.author.username,
      },
      post: {
        id: attachment.comment.post.id,
        type: "post",
        title: attachment.comment.post.title,
      },
    },
    member: {
      id: attachment.member.id,
      type: "member",
      name: attachment.member.display_name ?? attachment.member.username,
    },
    memberSession: attachment.memberSession
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
      : undefined,
  };
}
