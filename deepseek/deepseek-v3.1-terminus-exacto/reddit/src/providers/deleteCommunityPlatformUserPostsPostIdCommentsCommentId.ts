import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformUserPostsPostIdCommentsCommentId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the comment exists and belongs to the specified post
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        post: {
          id: props.postId,
        },
      },
      select: {
        id: true,
        author: {
          select: { id: true },
        } satisfies Prisma.community_platform_usersFindManyArgs,
        post: {
          select: {
            id: true,
            community_id: true,
          },
        } satisfies Prisma.community_platform_postsFindManyArgs,
      },
    });
  // Check authorization: user is comment author OR moderator for the community OR platform admin
  const isCommentAuthor = comment.author.id === props.user.id;
  if (isCommentAuthor) {
    // Comment author can always delete their own comment
    await MyGlobal.prisma.community_platform_comments.delete({
      where: { id: props.commentId },
    });
    return;
  }
  // For non-authors, check moderator or admin privileges
  const communityId = comment.post.community_id;
  // Check if user is moderator for this community
  const isModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        user_id: props.user.id,
        community_id: communityId,
        is_active: true,
        deleted_at: null,
      },
    });
  // Check if user has admin privileges (via user_roles or separate admin check)
  // Note: UserPayload is for regular users, so we need to check if this user has elevated privileges
  const hasElevatedPrivileges = isModerator; // Add admin check logic here if needed
  if (!hasElevatedPrivileges) {
    throw new HttpException("Forbidden", 403);
  }
  // Moderator or admin can delete the comment
  await MyGlobal.prisma.community_platform_comments.delete({
    where: { id: props.commentId },
  });
}
