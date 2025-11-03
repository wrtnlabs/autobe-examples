import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";

export async function getCommunityPlatformPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPost> {
  // Fetch post and all relevant relations
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    include: {
      user: true,
      community: true,
      community_platform_post_texts: true,
      community_platform_post_links: true,
      community_platform_post_images: true,
    },
  });
  if (!post) throw new HttpException("Post not found", 404);

  // Author ISummary
  const author = {
    id: post.user.id,
    display_name: post.user.display_name,
  };
  // Community ISummary
  const community = {
    id: post.community.id,
    name: post.community.name,
    description: post.community.description,
  };

  // Text content (nullable)
  const text_content = post.community_platform_post_texts
    ? { body: post.community_platform_post_texts.body }
    : null;
  // Link content (nullable)
  const link_content = post.community_platform_post_links
    ? {
        url: post.community_platform_post_links.url,
        summary: post.community_platform_post_links.summary || undefined,
      }
    : null;
  // Image contents (array)
  const image_contents = post.community_platform_post_images.map((img) => ({
    uri: img.uri,
    file_type: img.file_type,
    file_size_bytes: img.file_size_bytes,
  }));

  return {
    id: post.id,
    title: post.title,
    status: post.status,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : undefined,
    author,
    community,
    text_content,
    link_content,
    image_contents,
  };
}
