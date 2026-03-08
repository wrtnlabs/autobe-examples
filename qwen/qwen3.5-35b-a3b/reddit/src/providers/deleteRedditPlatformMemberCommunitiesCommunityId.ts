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
  // Verify community exists, is not soft-deleted, and user is owner
  const community = await MyGlobal.prisma.reddit_platform_communities.findFirst(
    {
      where: {
        id: props.communityId,
        deleted_at: null,
        owner_id: props.member.id,
      },
    },
  );
  if (community === null) {
    // If not found, either community doesn't exist or user is not owner
    const nonOwnerCheck =
      await MyGlobal.prisma.reddit_platform_communities.findFirst({
        where: {
          id: props.communityId,
          deleted_at: null,
        },
      });
    if (nonOwnerCheck === null) {
      throw new HttpException("Community not found", 404);
    }
    throw new HttpException("You are not the owner of this community", 403);
  }
  // Verify subscriber_count is 0 (no active subscribers)
  if (community.subscriber_count !== 0) {
    throw new HttpException("Community has active subscribers", 409);
  }
  // Begin transaction for cascade deletion
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete posts (this cascades to comments via onDelete: Cascade)
    await tx.reddit_platform_posts.deleteMany({
      where: {
        reddit_platform_community_id: props.communityId,
      },
    });
    // Delete subscriptions
    await tx.reddit_platform_community_subscriptions.deleteMany({
      where: {
        reddit_platform_community_id: props.communityId,
      },
    });
    // Delete moderators
    await tx.reddit_platform_community_moderators.deleteMany({
      where: {
        community_id: props.communityId,
      },
    });
    // Delete bans
    await tx.reddit_platform_community_bans.deleteMany({
      where: {
        community_id: props.communityId,
      },
    });
    // Delete the community itself
    await tx.reddit_platform_communities.delete({
      where: {
        id: props.communityId,
      },
    });
  });
}
