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

export async function deleteCommunityPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch post with author, community, and deletion status
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_member_id: true,
        community_platform_community_id: true,
        deleted_at: true,
      },
    },
  );
  // 2. Check if post is already deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // 3. Check if member is author
  const isAuthor = post.community_platform_member_id === props.member.id;
  // 4. If not author, check if member is moderator in post's community
  let hasModerationRole = false;
  if (!isAuthor) {
    // First check if community exists and is active
    const community =
      await MyGlobal.prisma.community_platform_communities.findFirst({
        where: {
          id: post.community_platform_community_id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!community) {
      // Community doesn't exist or is deleted, but author should still be able to delete their post
      throw new HttpException("Forbidden", 403);
    }
    // Check if member has active moderation role in this community
    const moderationRole =
      await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
        where: {
          community_platform_member_id: props.member.id,
          community_platform_community_id: post.community_platform_community_id,
          deleted_at: null,
          role_type: { in: ["owner", "moderator"] },
        },
        select: { id: true },
      });
    if (!moderationRole) {
      throw new HttpException("Forbidden", 403);
    }
    hasModerationRole = true;
  }
  // 5. Delete post (cascade handled by database)
  await MyGlobal.prisma.community_platform_posts.delete({
    where: { id: props.postId },
  });
}
