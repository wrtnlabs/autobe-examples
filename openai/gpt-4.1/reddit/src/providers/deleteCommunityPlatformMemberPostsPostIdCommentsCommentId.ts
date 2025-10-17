import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId, commentId } = props;

  // Step 1: Find comment and post's community
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: {
      id: commentId,
      community_platform_post_id: postId,
    },
    select: {
      id: true,
      community_platform_member_id: true,
      deleted_at: true,
      post: {
        select: {
          community_platform_community_id: true,
        },
      },
    },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  if (comment.deleted_at !== null)
    throw new HttpException("Comment already deleted", 409);

  // Step 2: Authorization (author or moderator of community)
  const isAuthor = member.id === comment.community_platform_member_id;
  let isModerator = false;
  if (!isAuthor && comment.post) {
    // Check active moderator assignment (end_at null = active)
    const activeModerator =
      await MyGlobal.prisma.community_platform_community_moderator_assignments.findFirst(
        {
          where: {
            community_id: comment.post.community_platform_community_id,
            member_id: member.id,
            end_at: null,
          },
          select: { id: true },
        },
      );
    isModerator = activeModerator !== null;
  }
  if (!isAuthor && !isModerator) {
    throw new HttpException("No permission to delete comment", 403);
  }

  // Step 3: Soft delete (set deleted_at/updated_at)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_comments.update({
    where: { id: commentId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Optionally: Insert into audit log table for compliance (not shown)
}
