import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostLinkArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinkArray";
import { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserPostsPostIdLinks(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostLinkArray> {
  // Step 1: Verify post exists and is not soft-deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, deleted_at: true },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found or has been deleted.", 404);
  }
  // Step 2: Retrieve all links for the given postId
  const links = await MyGlobal.prisma.community_platform_post_links.findMany({
    where: { community_platform_post_id: props.postId },
    orderBy: { id: "asc" },
  });
  // Step 3: Map raw results to DTO
  return links.map((link) => ({
    id: link.id,
    community_platform_post_id: link.community_platform_post_id,
    url: link.url,
    summary: link.summary ?? undefined,
  }));
}
