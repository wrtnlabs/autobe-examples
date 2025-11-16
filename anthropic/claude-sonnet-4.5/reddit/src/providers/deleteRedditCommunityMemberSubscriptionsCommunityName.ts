import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteRedditCommunityMemberSubscriptionsCommunityName(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<IRedditCommunityCommunitySubscription> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const subscription =
    await MyGlobal.prisma.reddit_community_community_subscriptions.findUnique({
      where: {
        member_id_community_id: {
          member_id: props.member.id,
          community_id: community.id,
        },
      },
    });

  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_community_community_subscriptions.delete({
      where: {
        member_id_community_id: {
          member_id: props.member.id,
          community_id: community.id,
        },
      },
    }),
    MyGlobal.prisma.reddit_community_communities.update({
      where: { id: community.id },
      data: {
        subscriber_count: {
          decrement: 1,
        },
      },
    }),
  ]);

  return {
    id: community.id,
    name: community.name,
    title: community.display_title,
    description: community.description,
    icon_url: community.icon_url ?? undefined,
    banner_url: community.banner_url ?? undefined,
    subscriber_count: community.subscriber_count - 1,
    post_count: community.post_count,
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
    deleted_at: community.deleted_at
      ? toISOStringSafe(community.deleted_at)
      : undefined,
  };
}
