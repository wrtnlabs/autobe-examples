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

export async function deleteRedditPlatformMemberCommunitiesCommunityIdSubscriptions(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify community exists and is not soft-deleted
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId },
      select: { id: true, deleted_at: true, subscriber_count: true },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  if (community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  // Find the subscription record
  const subscription =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findFirst({
      where: {
        member_id: props.member.id,
        community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (subscription === null) {
    throw new HttpException("Subscription not found", 404);
  }
  // Perform soft delete and decrement subscriber count in transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_platform_community_subscriptions.update({
      where: { id: subscription.id },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.reddit_platform_communities.update({
      where: { id: props.communityId, subscriber_count: { gte: 1 } },
      data: {
        subscriber_count: { decrement: 1 },
      },
    }),
  ]);
}
