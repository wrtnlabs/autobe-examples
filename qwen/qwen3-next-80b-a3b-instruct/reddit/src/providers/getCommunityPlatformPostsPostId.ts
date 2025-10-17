import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function getCommunityPlatformPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPost> {
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    include: {
      community_platform_post_images: true,
      community_platform_post_links: true,
    },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  return {
    id: post.id,
    community_platform_community_id: post.community_platform_community_id,
    author_id: post.author_id,
    title: post.title,
    content: post.content ?? "",
    post_type: typia.assert<"link" | "text" | "image">(post.post_type),
    vote_count: post.vote_count,
    comment_count: post.comment_count,
    status: typia.assert<"published" | "unreviewed" | "removed" | "archived">(
      post.status,
    ),
    created_at: toISOStringSafe(post.created_at),
    updated_at: post.updated_at ? toISOStringSafe(post.updated_at) : undefined,
    ...(post.post_type === "image" && post.community_platform_post_images
      ? { image_url: post.community_platform_post_images.image_url }
      : {}),
    ...(post.post_type === "link" && post.community_platform_post_links
      ? { link_url: post.community_platform_post_links.url }
      : {}),
  } satisfies ICommunityPlatformPost;
}
