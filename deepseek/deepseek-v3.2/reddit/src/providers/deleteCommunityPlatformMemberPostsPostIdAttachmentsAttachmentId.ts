import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformMemberPostsPostIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify post exists and is not soft-deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: {
        id: props.postId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_platform_member_id: true,
        community_platform_community_id: true,
      },
    },
  );
  // Verify attachment exists and belongs to the specified post
  const attachment =
    await MyGlobal.prisma.community_platform_post_attachments.findUniqueOrThrow(
      {
        where: {
          id: props.attachmentId,
          deleted_at: null,
        },
        select: {
          id: true,
          community_platform_post_id: true,
        },
      },
    );
  // Ensure attachment belongs to the specified post
  if (attachment.community_platform_post_id !== props.postId) {
    throw new HttpException(
      "Attachment does not belong to the specified post",
      400,
    );
  }
  // Check authorization: post author or community moderator
  const isAuthor = post.community_platform_member_id === props.member.id;
  let isModerator = false;
  if (!isAuthor) {
    // Check if member is a moderator in the post's community
    const moderationRole =
      await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
        where: {
          community_platform_member_id: props.member.id,
          community_platform_community_id: post.community_platform_community_id,
          deleted_at: null,
        },
        select: { id: true },
      });
    isModerator = moderationRole !== null;
  }
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Use transaction for atomicity
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete the attachment (cascades to file via ON DELETE Cascade)
    await tx.community_platform_post_attachments.delete({
      where: { id: props.attachmentId },
    });
    // Update post's updated_at timestamp
    await tx.community_platform_posts.update({
      where: { id: props.postId },
      data: { updated_at: new Date() },
    });
  });
}
