import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostImageCollector } from "../collectors/CommunityPlatformPostImageCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformPostImageTransformer } from "../transformers/CommunityPlatformPostImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserPostsPostIdImages(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostImage.ICreate;
}): Promise<ICommunityPlatformPostImage> {
  const { user, postId, body } = props;
  // Extract image_urls array from body safely
  const imageUrls = (body as any).image_urls as unknown;
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    throw new HttpException("No images provided", 400);
  }
  // Validate each URL
  for (const url of imageUrls) {
    if (typeof url !== "string" || url.trim() === "") {
      throw new HttpException("Invalid image URL", 400);
    }
    try {
      new URL(url);
    } catch {
      throw new HttpException("Invalid image URL format", 400);
    }
  }
  // Verify the post exists and get author and community
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId },
    select: {
      id: true,
      author_user_id: true,
      community_id: true,
    },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  // Permission check: user must be author or community moderator
  if (post.author_user_id !== user.id) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: post.community_id,
          user_id: user.id, // Correct relation property name
        },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Transactional creation of multiple images
  const createdImages = await MyGlobal.prisma.$transaction(async (tx) => {
    const images: ICommunityPlatformPostImage[] = [];
    for (const imageUrl of imageUrls) {
      const data = await CommunityPlatformPostImageCollector.collect({
        body: { image_url: imageUrl },
        communityPlatformPosts: { id: postId },
      });
      const created = await tx.community_platform_post_images.create({
        data,
        ...CommunityPlatformPostImageTransformer.select(),
      });
      images.push(
        await CommunityPlatformPostImageTransformer.transform(created),
      );
    }
    return images;
  });
  return createdImages[0];
}
