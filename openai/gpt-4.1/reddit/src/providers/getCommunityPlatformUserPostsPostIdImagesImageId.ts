import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserPostsPostIdImagesImageId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostImage> {
  // Find the image, ensure it belongs to the specified post
  const image = await MyGlobal.prisma.community_platform_post_images.findUnique(
    {
      where: { id: props.imageId },
    },
  );

  // Not found or not belongs to post
  if (!image || image.community_platform_post_id !== props.postId) {
    throw new HttpException("Image not found for this post", 404);
  }

  // Extra: check the post is not soft-deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: { deleted_at: true },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found or deleted", 404);
  }

  return {
    id: image.id,
    community_platform_post_id: image.community_platform_post_id,
    uri: image.uri,
    file_type: image.file_type,
    file_size_bytes: image.file_size_bytes,
  };
}
