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

export async function putDiscussionBoardMemberPostsPostIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPostAttachment.IUpdate;
}): Promise<IDiscussionBoardPostAttachment> {
  // Verify the attachment exists and belongs to the specified post
  const attachment =
    await MyGlobal.prisma.discussion_board_post_attachments.findFirst({
      where: {
        id: props.attachmentId,
        discussion_board_post_id: props.postId,
        deleted_at: null,
      },
    });

  if (!attachment) {
    throw new HttpException(
      "Attachment not found or does not belong to the specified post",
      404,
    );
  }

  // Verify the member has permission to update this attachment
  if (attachment.discussion_board_member_id !== props.member.id) {
    throw new HttpException(
      "You do not have permission to update this attachment",
      403,
    );
  }

  // Update the attachment with provided fields
  const updated =
    await MyGlobal.prisma.discussion_board_post_attachments.update({
      where: {
        id: props.attachmentId,
      },
      data: {
        description: props.body.description,
        security_scan_result: props.body.security_scan_result,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Fetch related data separately since include relationships don't work as expected
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: attachment.discussion_board_post_id },
    select: { id: true, title: true },
  });

  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: attachment.discussion_board_member_id },
    select: { id: true },
  });

  const memberSession = attachment.discussion_board_member_session_id
    ? await MyGlobal.prisma.discussion_board_member_sessions.findUnique({
        where: { id: attachment.discussion_board_member_session_id },
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
      })
    : null;

  // Convert to API response format
  return {
    id: updated.id,
    file_name: updated.file_name,
    file_type: updated.file_type,
    file_size: updated.file_size,
    storage_path: updated.storage_path,
    upload_status: updated.upload_status,
    security_scan_result: updated.security_scan_result ?? undefined,
    description: updated.description ?? undefined,
    download_count: updated.download_count,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    post: {
      id: post?.id ?? "",
      type: "post",
      title: post?.title ?? "",
    },
    member: {
      id: member?.id ?? "",
      type: "member",
      name: "Member", // Default name since actual name field doesn't exist
    },
    member_session: memberSession
      ? {
          id: memberSession.id,
          ip: memberSession.ip,
          href: memberSession.href,
          referrer: memberSession.referrer,
          created_at: toISOStringSafe(memberSession.created_at),
          updated_at: toISOStringSafe(memberSession.updated_at),
          expired_at: memberSession.expired_at
            ? toISOStringSafe(memberSession.expired_at)
            : undefined,
          deleted_at: memberSession.deleted_at
            ? toISOStringSafe(memberSession.deleted_at)
            : undefined,
        }
      : undefined,
  };
}
