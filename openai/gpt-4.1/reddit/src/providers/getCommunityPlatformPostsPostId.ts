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
import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

export async function getCommunityPlatformPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPost> {
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    include: {
      user: true,
      userSession: true,
      community: true,
    },
  });

  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }

  return {
    id: post.id,
    type: post.type,
    title: post.title,
    body: post.body === undefined ? undefined : post.body,
    link_url: post.link_url === undefined ? undefined : post.link_url,
    image_url: post.image_url === undefined ? undefined : post.image_url,
    status: post.status,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at:
      post.deleted_at !== null && post.deleted_at !== undefined
        ? toISOStringSafe(post.deleted_at)
        : undefined,
    user: { id: post.user.id },
    userSession: {
      id: post.userSession.id,
      created_at: toISOStringSafe(post.userSession.created_at),
    },
    community: {
      id: post.community.id,
      name: post.community.name,
      display_title: post.community.display_title,
      description: post.community.description,
      visibility: post.community.visibility,
      image_url:
        post.community.image_url === undefined
          ? undefined
          : post.community.image_url,
      status: post.community.status,
    },
  };
}
