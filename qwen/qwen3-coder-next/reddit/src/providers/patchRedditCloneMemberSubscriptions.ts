import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
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

export async function patchRedditCloneMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditCloneCommunity.IRequest;
}): Promise<IPageIRedditCloneCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where condition with optional name filter
  const where: Prisma.reddit_clone_content_subscriptionsWhereInput = {
    member_id: props.member.id,
    community: {
      ...(props.body.name && { name: { contains: props.body.name } }),
    },
  };
  // Query subscriptions with pagination
  const subscriptions =
    await MyGlobal.prisma.reddit_clone_content_subscriptions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            subscriber_count: true,
            created_at: true,
            owner: {
              select: {
                id: true,
                username: true,
                display_name: true,
                avatar_url: true,
              },
            },
          },
        },
      },
    });
  // Count total subscribed communities
  const total = await MyGlobal.prisma.reddit_clone_content_subscriptions.count({
    where,
  });
  // Transform to response format
  const data = subscriptions
    .map((sub) => sub.community)
    .map((community) => ({
      id: community.id,
      name: community.name,
      description:
        community.description === null ? undefined : community.description,
      iconUrl: community.icon_url === null ? undefined : community.icon_url,
      subscriberCount: community.subscriber_count,
      createdAt: toISOStringSafe(community.created_at),
      owner: {
        id: community.owner.id,
        username: community.owner.username,
        displayName:
          community.owner.display_name === null
            ? undefined
            : community.owner.display_name,
        avatarUrl:
          community.owner.avatar_url === null
            ? undefined
            : community.owner.avatar_url,
      },
    }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIRedditCloneCommunity.ISummary;
}
