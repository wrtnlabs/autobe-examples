import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberPostsPostIdAttachments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPostAttachment.ICreate;
}): Promise<IDiscussionBoardPostAttachment> {
  // Verify the member exists and is active
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  // Verify the post exists and belongs to the member
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Verify the member session exists
  const memberSession =
    await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
      where: {
        id: props.body.discussion_board_member_session_id,
        discussion_board_member_id: props.member.id,
        deleted_at: null,
      },
    });

  if (!memberSession) {
    throw new HttpException("Invalid member session", 400);
  }

  // Generate UUID properly typed
  const attachmentId: string & tags.Format<"uuid"> = v4();
  const now = toISOStringSafe(new Date());

  // Create the attachment record
  const attachment =
    await MyGlobal.prisma.discussion_board_post_attachments.create({
      data: {
        id: attachmentId,
        file_name: props.body.file_name,
        file_type: props.body.file_type,
        file_size: props.body.file_size,
        storage_path: props.body.storage_path,
        upload_status: "pending",
        security_scan_result: null,
        description: props.body.description ?? null,
        download_count: 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        discussion_board_post_id: props.postId,
        discussion_board_member_id: props.member.id,
        discussion_board_member_session_id:
          props.body.discussion_board_member_session_id,
      },
      include: {
        post: {
          select: {
            id: true,
            title: true,
          },
        },
        member: {
          select: {
            id: true,
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

  // Transform to match the API interface
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
    post: {
      id: attachment.post.id,
      type: "post",
      title: attachment.post.title,
    },
    member: {
      id: attachment.member.id,
      type: "member",
      name: attachment.member.display_name ?? "Unknown Member",
    },
    member_session: attachment.memberSession
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
