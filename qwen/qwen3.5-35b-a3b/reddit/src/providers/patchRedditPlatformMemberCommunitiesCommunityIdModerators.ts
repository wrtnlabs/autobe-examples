import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityModerator";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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

export async function patchRedditPlatformMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityModerator.IRequest;
}): Promise<IPageIRedditPlatformCommunityModerator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sortField = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "ASC";
  const cursor = props.body.cursor;
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const isOwner = community.owner_id === props.member.id;
  if (!isOwner) {
    const moderatorRecord =
      await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
        where: {
          community_id: props.communityId,
          user_id: props.member.id,
        },
      });
    if (moderatorRecord === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const whereCondition: Prisma.reddit_platform_community_moderatorsWhereInput =
    {
      community_id: props.communityId,
      ...(props.body.user_id !== undefined && { user_id: props.body.user_id }),
      ...(cursor !== undefined && { created_at: { gt: new Date(cursor) } }),
    };
  const orderByCondition: Prisma.reddit_platform_community_moderatorsOrderByWithRelationInput[] =
    [{ [sortField]: sortOrder }];
  const data =
    await MyGlobal.prisma.reddit_platform_community_moderators.findMany({
      where: whereCondition,
      orderBy: orderByCondition,
      take: limit + 1,
      include: {
        community: {
          include: {
            owner: {
              select: {
                id: true,
                username: true,
                display_name: true,
                bio: true,
                avatar_url: true,
                karma_score: true,
                created_at: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma_score: true,
            created_at: true,
          },
        },
      },
    });
  const hasMore = data.length > limit;
  const actualData = hasMore ? data.slice(0, -1) : data;
  const nextCursor = hasMore ? data[limit].created_at.toISOString() : undefined;
  const total =
    await MyGlobal.prisma.reddit_platform_community_moderators.count({
      where: whereCondition,
    });
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  const transformedData = actualData.map((record) => {
    const owner = record.community.owner;
    const transformedOwner: IRedditPlatformMember.ISummary = {
      id: owner.id,
      username: owner.username,
      displayName: owner.display_name,
      bio: owner.bio ?? null,
      avatarUrl: owner.avatar_url ?? null,
      karmaScore: owner.karma_score,
      createdAt: owner.created_at.toISOString(),
      subscriptionCount: 0,
    };
    const transformedUser: IRedditPlatformMember.ISummary = {
      id: record.user.id,
      username: record.user.username,
      displayName: record.user.display_name,
      bio: record.user.bio ?? null,
      avatarUrl: record.user.avatar_url ?? null,
      karmaScore: record.user.karma_score,
      createdAt: record.user.created_at.toISOString(),
      subscriptionCount: 0,
    };
    const transformedCommunity: IRedditPlatformCommunity.ISummary = {
      id: record.community.id,
      name: record.community.name,
      description: record.community.description,
      icon_url: record.community.icon_url ?? null,
      subscriber_count: record.community.subscriber_count,
      author: transformedOwner,
      created_at: record.community.created_at.toISOString(),
    };
    return {
      id: record.id,
      community: transformedCommunity,
      user: transformedUser,
      created_at: record.created_at.toISOString(),
    } satisfies IRedditPlatformCommunityModerator.ISummary;
  });
  return {
    pagination,
    data: transformedData,
  } satisfies IPageIRedditPlatformCommunityModerator.ISummary;
}
