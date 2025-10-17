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
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Access logic: hide if deleted or status is restricted
  const forbiddenStatuses = ["removed", "mod_queued", "pending", "hidden"];
  if (post.deleted_at !== null || forbiddenStatuses.includes(post.status)) {
    throw new HttpException("Post not found", 404);
  }

  return {
    id: post.id,
    community_platform_member_id: post.community_platform_member_id,
    community_platform_community_id: post.community_platform_community_id,
    title: post.title,
    content_body: post.content_body === null ? undefined : post.content_body,
    content_type: post.content_type,
    status: post.status,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at: undefined,
  };
}
