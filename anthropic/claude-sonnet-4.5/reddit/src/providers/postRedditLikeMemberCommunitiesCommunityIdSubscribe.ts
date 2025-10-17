import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditLikeMemberCommunitiesCommunityIdSubscribe(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeCommunitySubscription> {
  const { member, communityId } = props;

  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: communityId,
      deleted_at: null,
    },
  });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const existingSubscription =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findFirst({
      where: {
        community_id: communityId,
        member_id: member.id,
      },
    });

  if (existingSubscription) {
    return {
      id: existingSubscription.id,
      community_id: existingSubscription.community_id,
      member_id: existingSubscription.member_id,
      subscribed_at: toISOStringSafe(existingSubscription.subscribed_at),
    };
  }

  const subscriptionId = v4();
  const subscribedAt = new Date();

  const created =
    await MyGlobal.prisma.reddit_like_community_subscriptions.create({
      data: {
        id: subscriptionId,
        community_id: communityId,
        member_id: member.id,
        subscribed_at: subscribedAt,
      },
    });

  await MyGlobal.prisma.reddit_like_communities.update({
    where: { id: communityId },
    data: {
      subscriber_count: {
        increment: 1,
      },
    },
  });

  return {
    id: created.id,
    community_id: created.community_id,
    member_id: created.member_id,
    subscribed_at: toISOStringSafe(created.subscribed_at),
  };
}
