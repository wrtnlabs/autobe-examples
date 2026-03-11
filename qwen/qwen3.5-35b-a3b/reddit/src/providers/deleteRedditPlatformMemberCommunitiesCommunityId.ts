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

export async function deleteRedditPlatformMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Fetch community and verify ownership
    const community = await tx.reddit_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
    // Verify ownership
    if (community.owner_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    // Check if already deleted
    if (community.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }
    // Create audit log entry
    await tx.reddit_platform_moderation_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderator_id: props.member.id,
        community_id: props.communityId,
        action_type: "delete_community",
        action_target_type: "community",
        action_target_id: props.communityId,
        action_reason: "Community deletion by owner",
        created_at: now,
        updated_at: now,
      },
    });
    // Get post IDs for engagement stats cascade
    const posts = await tx.reddit_platform_posts.findMany({
      where: { reddit_platform_community_id: props.communityId },
      select: { id: true },
    });
    const postIds = posts.map((p) => p.id) as string[];
    // Cascade deletions in dependency order
    // 1. Delete audit logs for this community
    await tx.reddit_platform_moderation_audit_logs.deleteMany({
      where: { community_id: props.communityId },
    });
    // 2. Delete ban records
    await tx.reddit_platform_community_bans.deleteMany({
      where: { community_id: props.communityId },
    });
    // 3. Delete moderator assignments
    await tx.reddit_platform_community_moderators.deleteMany({
      where: { community_id: props.communityId },
    });
    // 4. Delete subscriptions
    await tx.reddit_platform_community_subscriptions.deleteMany({
      where: { reddit_platform_community_id: props.communityId },
    });
    // 5. Soft delete posts
    await tx.reddit_platform_posts.updateMany({
      where: { reddit_platform_community_id: props.communityId },
      data: { deleted_at: now },
    });
    // 6. Soft delete engagement stats
    await tx.reddit_platform_post_engagement_stats.updateMany({
      where: { post_id: { in: postIds } },
      data: { deleted_at: now },
    });
    // 7. Soft delete community
    await tx.reddit_platform_communities.update({
      where: { id: props.communityId },
      data: { deleted_at: now },
    });
  });
}
