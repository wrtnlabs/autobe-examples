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

export async function deleteCommunityPlatformMemberPostsPostIdLink(props: {
  member: MemberPayload;
  postId: string;
}): Promise<void> {
  // First verify the post exists, is not deleted, and member is the author
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      community_platform_member_id: true,
      content_type: true,
      deleted_at: true,
    },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  if (post.deleted_at !== null) {
    throw new HttpException("Post is deleted", 410);
  }
  if (post.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (post.content_type !== "LINK") {
    throw new HttpException("Post is not a LINK type", 400);
  }
  // Check if link metadata exists
  const link = await MyGlobal.prisma.community_platform_post_links.findUnique({
    where: { community_platform_post_id: props.postId },
  });
  if (!link) {
    // Link metadata doesn't exist - nothing to delete
    return;
  }
  // Delete the link metadata
  await MyGlobal.prisma.community_platform_post_links.delete({
    where: { community_platform_post_id: props.postId },
  });
}
