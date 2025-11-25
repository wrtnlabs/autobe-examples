import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditCommunityMemberCommunitiesCommunityNameSubscriptions(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<IRedditCommunityCommunitySubscription> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const existingSubscription =
    await MyGlobal.prisma.reddit_community_community_subscriptions.findFirst({
      where: {
        member_id: props.member.id,
        community_id: community.id,
      },
    });

  if (existingSubscription) {
    return {
      id: community.id,
      name: community.name,
      title: community.display_title,
      description: community.description,
      icon_url: community.icon_url === null ? undefined : community.icon_url,
      banner_url:
        community.banner_url === null ? undefined : community.banner_url,
      subscriber_count: community.subscriber_count,
      post_count: community.post_count,
      created_at: toISOStringSafe(community.created_at),
      updated_at: toISOStringSafe(community.updated_at),
      deleted_at: community.deleted_at
        ? toISOStringSafe(community.deleted_at)
        : undefined,
    };
  }

  const updatedCommunity = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.reddit_community_community_subscriptions.create({
      data: {
        id: v4(),
        member_id: props.member.id,
        community_id: community.id,
        created_at: toISOStringSafe(new Date()),
      },
    });

    const updated = await tx.reddit_community_communities.update({
      where: { id: community.id },
      data: {
        subscriber_count: {
          increment: 1,
        },
      },
    });

    return updated;
  });

  return {
    id: updatedCommunity.id,
    name: updatedCommunity.name,
    title: updatedCommunity.display_title,
    description: updatedCommunity.description,
    icon_url:
      updatedCommunity.icon_url === null
        ? undefined
        : updatedCommunity.icon_url,
    banner_url:
      updatedCommunity.banner_url === null
        ? undefined
        : updatedCommunity.banner_url,
    subscriber_count: updatedCommunity.subscriber_count,
    post_count: updatedCommunity.post_count,
    created_at: toISOStringSafe(updatedCommunity.created_at),
    updated_at: toISOStringSafe(updatedCommunity.updated_at),
    deleted_at: updatedCommunity.deleted_at
      ? toISOStringSafe(updatedCommunity.deleted_at)
      : undefined,
  };
}
