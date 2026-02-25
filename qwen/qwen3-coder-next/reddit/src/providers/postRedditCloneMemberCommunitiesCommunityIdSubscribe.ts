import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
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

export async function postRedditCloneMemberCommunitiesCommunityIdSubscribe(props: {
  member: MemberPayload;
  communityId: string;
}): Promise<IRedditCloneCommunity.ISummary> {
  // Validate community exists
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  // Check if already subscribed
  const existingSubscription =
    await MyGlobal.prisma.reddit_clone_content_subscriptions.findFirst({
      where: {
        member_id: props.member.id,
        community_id: props.communityId,
      },
    });
  if (existingSubscription) {
    throw new HttpException("Already subscribed", 409);
  }
  // Check if banned from community - use deleted_at instead of expires_at
  const banRecord = await MyGlobal.prisma.reddit_clone_community_bans.findFirst(
    {
      where: {
        user_id: props.member.id,
        community_id: props.communityId,
        deleted_at: null,
      },
    },
  );
  if (banRecord) {
    throw new HttpException("Banned from this community", 403);
  }
  // Check if user is the owner
  if (community.owner_id === props.member.id) {
    throw new HttpException("Cannot subscribe to own community", 403);
  }
  // Create subscription record with proper timestamp handling using toISOStringSafe
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.reddit_clone_content_subscriptions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member_id: props.member.id as string & tags.Format<"uuid">,
      community_id: props.communityId as string & tags.Format<"uuid">,
      created_at: now,
      updated_at: now,
    },
  });
  // Increment subscriber count with proper timestamp handling
  await MyGlobal.prisma.reddit_clone_communities.update({
    where: { id: props.communityId },
    data: {
      subscriber_count: { increment: 1 },
      updated_at: now,
    },
  });
  // Return updated community summary
  const summary: IRedditCloneCommunity.ISummary = {
    id: community.id,
    owner: {
      id: community.owner_id,
      username: "",
      displayName: null,
      avatarUrl: null,
    },
    name: community.name,
    description: community.description,
    iconUrl: community.icon_url,
    subscriberCount: community.subscriber_count,
    createdAt: toISOStringSafe(community.created_at),
  };
  return summary;
}
