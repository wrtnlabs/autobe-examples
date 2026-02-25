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

export async function deleteCommunityPlatformUserPostsPostIdImagesImageId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify image existence with its post
  const imageRecord =
    await MyGlobal.prisma.community_platform_post_images.findUnique({
      where: { id: props.imageId },
      select: {
        id: true,
        community_platform_post_id: true,
        deleted_at: true,
        post: {
          select: {
            id: true,
            author_user_id: true,
            author_moderator_id: true,
            community_id: true,
            deleted_at: true,
          },
        },
      },
    });
  if (!imageRecord || imageRecord.deleted_at !== null) {
    throw new HttpException("Image not found", 404);
  }
  const post = imageRecord.post;
  if (!post || post.deleted_at !== null || post.id !== props.postId) {
    throw new HttpException("Post not found or mismatched", 404);
  }
  // Check authorization: user is the post author
  if (post.author_user_id === props.user.id) {
    // Authorized
  } else {
    // Check if user is a moderator of the community
    const moderator =
      await MyGlobal.prisma.community_platform_moderators.findUnique({
        where: { id: props.user.id },
        select: {
          id: true,
          deleted_at: true,
        },
      });
    if (!moderator || moderator.deleted_at !== null) {
      throw new HttpException("Forbidden", 403);
    }
    const isCommunityModerator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: post.community_id,
          community_moderator_id: props.user.id,
          deleted_at: null,
        },
      });
    if (!isCommunityModerator) {
      throw new HttpException("Forbidden", 403);
    }
    // Authorized as moderator
  }
  // Proceed with transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_post_images.delete({
      where: { id: props.imageId },
    });
    // Optional: Update image count or other cached metadata on post if applicable
    // Optional: Log the deletion action for audit compliance
  });
}
