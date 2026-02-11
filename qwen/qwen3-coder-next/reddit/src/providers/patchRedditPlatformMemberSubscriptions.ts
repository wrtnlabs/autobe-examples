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

export async function patchRedditPlatformMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditPlatformSubscription.IRequest;
}): Promise<IPageIRedditPlatformSubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const where: Prisma.reddit_platform_subscriptionsWhereInput = {
    user_id: props.member.id,
    ...(props.body.communityId && { community_id: props.body.communityId }),
    ...(props.body.createdAtFrom && {
      created_at: { gte: props.body.createdAtFrom },
    }),
    ...(props.body.createdAtTo && {
      created_at: { lte: props.body.createdAtTo },
    }),
  };
  // Fetch data with communities
  const subscriptions =
    await MyGlobal.prisma.reddit_platform_subscriptions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            subscriber_count: true,
          },
        },
      },
    });
  // Filter by community name if needed (server-side since Prisma doesn't support join filtering in where easily)
  let filteredSubscriptions = subscriptions;
  if (props.body.name) {
    filteredSubscriptions = subscriptions.filter((sub: any) =>
      sub.community.name.toLowerCase().includes(props.body.name!.toLowerCase()),
    );
  }
  // Fetch total count (with name filter applied)
  let total = 0;
  if (props.body.name) {
    // For name search, need to do a join query
    total = await MyGlobal.prisma.reddit_platform_subscriptions.count({
      where: {
        user_id: props.member.id,
        community: {
          name: { contains: props.body.name, mode: "insensitive" },
        },
        ...(props.body.communityId && { community_id: props.body.communityId }),
        ...(props.body.createdAtFrom && {
          created_at: { gte: props.body.createdAtFrom },
        }),
        ...(props.body.createdAtTo && {
          created_at: { lte: props.body.createdAtTo },
        }),
      },
    });
  } else {
    total = await MyGlobal.prisma.reddit_platform_subscriptions.count({
      where,
    });
  }
  // Transform to ISummary
  const data = filteredSubscriptions.map((sub: any) => ({
    id: sub.id as string & tags.Format<"uuid">,
    createdAt: toISOStringSafe(sub.created_at),
    user: {
      id: sub.user.id as string & tags.Format<"uuid">,
      username: sub.user.username,
      displayName:
        sub.user.display_name === null ? undefined : sub.user.display_name,
      avatarUrl: sub.user.avatar_url === null ? undefined : sub.user.avatar_url,
    },
    community: {
      id: sub.community.id as string & tags.Format<"uuid">,
      name: sub.community.name,
      description:
        sub.community.description === null
          ? undefined
          : sub.community.description,
      iconUrl: sub.community.icon_url === null ? null : sub.community.icon_url,
      subscriberCount: sub.community.subscriber_count as number &
        tags.Type<"int32">,
    },
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
