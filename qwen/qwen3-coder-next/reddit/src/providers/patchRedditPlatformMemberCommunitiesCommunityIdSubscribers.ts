import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
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

export async function patchRedditPlatformMemberCommunitiesCommunityIdSubscribers(props: {
  member: MemberPayload;
  communityId: string;
}): Promise<IPageIRedditPlatformSubscription.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.reddit_platform_subscriptions.findMany({
    where: {
      community_id: props.communityId,
    },
    skip,
    take: limit,
    include: {
      user: true,
      community: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });
  const total = await MyGlobal.prisma.reddit_platform_subscriptions.count({
    where: {
      community_id: props.communityId,
    },
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      createdAt: toISOStringSafe(record.created_at),
      user: {
        id: record.user.id,
        username: record.user.username,
        displayName: record.user.display_name,
        avatarUrl: record.user.avatar_url,
      },
      community: {
        id: record.community.id,
        name: record.community.name,
        description: record.community.description,
        iconUrl: record.community.icon_url,
        subscriberCount: record.community.subscriber_count,
      },
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
