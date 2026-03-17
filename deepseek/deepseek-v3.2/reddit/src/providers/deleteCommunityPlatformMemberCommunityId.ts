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

export async function deleteCommunityPlatformMemberCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Validate community exists and is not deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_member_id: true,
        posts: {
          where: { deleted_at: null },
          select: { id: true },
          take: 1,
        } satisfies Prisma.community_platform_postsFindManyArgs,
        communitySubscriptions: {
          where: { deleted_at: null },
          select: { id: true },
          take: 1,
        } satisfies Prisma.community_platform_subscriptionsFindManyArgs,
      },
    });
  // 2. Verify authorization - only owner can delete
  if (community.owner_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check for active content that might prevent deletion
  if (community.posts.length > 0) {
    throw new HttpException(
      "Community has active posts that must be resolved before deletion",
      409,
    );
  }
  if (community.communitySubscriptions.length > 0) {
    throw new HttpException(
      "Community has active subscriptions that must be resolved before deletion",
      409,
    );
  }
  // 4. Perform atomic soft deletion cascade
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    // 4.1. Soft delete moderation roles
    await tx.community_platform_moderation_roles.updateMany({
      where: {
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
    // 4.2. Soft delete bans
    await tx.community_platform_bans.updateMany({
      where: {
        community_id: props.communityId,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
    // 4.3. Soft delete subscriptions (unsubscribe all)
    await tx.community_platform_subscriptions.updateMany({
      where: {
        community_id: props.communityId,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
        updated_at: now,
        active: false,
      },
    });
    // 4.4. Soft delete the community itself
    await tx.community_platform_communities.update({
      where: { id: props.communityId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  });
}
