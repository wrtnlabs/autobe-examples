import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function getDiscussionBoardMemberPostsPostIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardPostAttachment> {
  // First verify the post exists and is accessible
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Find the attachment with its related entities
  const attachment =
    await MyGlobal.prisma.discussion_board_post_attachments.findFirst({
      where: {
        id: props.attachmentId,
        discussion_board_post_id: props.postId,
        deleted_at: null,
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

  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }

  // Convert dates to ISO strings and build the response
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
    deleted_at:
      attachment.deleted_at === null
        ? undefined
        : toISOStringSafe(attachment.deleted_at),
    post: {
      id: attachment.post.id,
      type: "post",
      title: attachment.post.title,
    },
    member: {
      id: attachment.member.id,
      type: "member",
      name:
        attachment.member.display_name !== null
          ? attachment.member.display_name
          : "Unknown Member",
    },
    member_session:
      attachment.memberSession === null
        ? undefined
        : {
            id: attachment.memberSession.id,
            ip: attachment.memberSession.ip,
            href: attachment.memberSession.href,
            referrer: attachment.memberSession.referrer,
            created_at: toISOStringSafe(attachment.memberSession.created_at),
            updated_at: toISOStringSafe(attachment.memberSession.updated_at),
            expired_at:
              attachment.memberSession.expired_at === null
                ? undefined
                : toISOStringSafe(attachment.memberSession.expired_at),
            deleted_at:
              attachment.memberSession.deleted_at === null
                ? undefined
                : toISOStringSafe(attachment.memberSession.deleted_at),
          },
  };
}
