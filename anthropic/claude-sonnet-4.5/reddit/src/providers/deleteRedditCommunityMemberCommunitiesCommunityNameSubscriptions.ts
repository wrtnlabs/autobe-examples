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

export async function deleteRedditCommunityMemberCommunitiesCommunityNameSubscriptions(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<IRedditCommunityCommunitySubscription> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: {
        name: props.communityName,
      },
    });

  if (!community || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }

  const subscription =
    await MyGlobal.prisma.reddit_community_community_subscriptions.findFirst({
      where: {
        member_id: props.member.id,
        community_id: community.id,
      },
    });

  let newSubscriberCount = community.subscriber_count;

  if (subscription) {
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.reddit_community_community_subscriptions.delete({
        where: {
          id: subscription.id,
        },
      }),
      MyGlobal.prisma.reddit_community_communities.update({
        where: {
          id: community.id,
        },
        data: {
          subscriber_count: {
            decrement: 1,
          },
        },
      }),
    ]);

    newSubscriberCount = community.subscriber_count - 1;
  }

  return {
    id: community.id,
    name: community.name,
    title: community.display_title,
    description: community.description,
    icon_url: community.icon_url === null ? undefined : community.icon_url,
    banner_url:
      community.banner_url === null ? undefined : community.banner_url,
    subscriber_count: newSubscriberCount,
    post_count: community.post_count,
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
    deleted_at:
      community.deleted_at === null
        ? undefined
        : toISOStringSafe(community.deleted_at),
  };
}
