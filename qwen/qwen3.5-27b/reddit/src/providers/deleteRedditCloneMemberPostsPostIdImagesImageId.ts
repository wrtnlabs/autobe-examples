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

export async function deleteRedditCloneMemberPostsPostIdImagesImageId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the image and verify it belongs to the post
  const image =
    await MyGlobal.prisma.reddit_clone_post_images.findUniqueOrThrow({
      where: {
        id: props.imageId,
        reddit_clone_post_id: props.postId,
      },
      select: {
        id: true,
        deleted_at: true,
        post: {
          select: {
            id: true,
            reddit_clone_members_id: true,
            deleted_at: true,
            community: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  // Verify image is not already deleted
  if (image.deleted_at !== null) {
    throw new HttpException("Image already deleted", 404);
  }
  // Verify post is not deleted
  if (image.post.deleted_at !== null) {
    throw new HttpException("Post already deleted", 404);
  }
  // Check authorization: must be post author or community moderator
  const isAuthor = image.post.reddit_clone_members_id === props.member.id;
  if (!isAuthor) {
    // Check if member is a moderator of the community
    const isModerator =
      await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
        where: {
          reddit_clone_communities_id: image.post.community.id,
          reddit_clone_members_id: props.member.id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!isModerator) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Soft delete the image
  await MyGlobal.prisma.reddit_clone_post_images.update({
    where: { id: props.imageId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
