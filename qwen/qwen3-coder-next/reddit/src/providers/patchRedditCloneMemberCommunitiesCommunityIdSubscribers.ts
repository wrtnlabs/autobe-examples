import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentSubscription";
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

export async function patchRedditCloneMemberCommunitiesCommunityIdSubscribers(props: {
  member: MemberPayload;
  communityId: string;
}): Promise<IRedditCloneContentSubscription> {
  // Validate authenticated member context
  const { member, communityId } = props;
  // Check community exists and retrieve its details
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: communityId as string & tags.Format<"uuid"> },
    });
  // Check if member is already subscribed
  const existingSubscription =
    await MyGlobal.prisma.reddit_clone_content_subscriptions.findUnique({
      where: {
        member_id_community_id: {
          member_id: member.id,
          community_id: communityId as string & tags.Format<"uuid">,
        },
      },
    });
  if (existingSubscription !== null) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  // Check if member is banned from the community
  const banRecord = await MyGlobal.prisma.reddit_clone_ban_records.findFirst({
    where: {
      member_id: member.id,
      community_id: communityId as string & tags.Format<"uuid">,
    },
  });
  if (banRecord !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Create subscription record
  const now = new Date();
  const subscription =
    await MyGlobal.prisma.reddit_clone_content_subscriptions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        member_id: member.id,
        community_id: communityId as string & tags.Format<"uuid">,
        created_at: now,
        updated_at: now,
      },
    });
  // Increment community subscriber count
  await MyGlobal.prisma.reddit_clone_communities.update({
    where: { id: communityId as string & tags.Format<"uuid"> },
    data: {
      subscriber_count: { increment: 1 },
    },
  });
  // Return subscription confirmation
  return {
    id: subscription.id as string & tags.Format<"uuid">,
    member_id: subscription.member_id as string & tags.Format<"uuid">,
    community_id: subscription.community_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(subscription.created_at),
    updated_at: toISOStringSafe(subscription.updated_at),
  };
}
