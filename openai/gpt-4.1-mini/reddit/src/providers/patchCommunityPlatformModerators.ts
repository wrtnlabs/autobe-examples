import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModerators(props: {
  body: ICommunityPlatformCommunityModerator.IRequest;
}): Promise<IPageICommunityPlatformCommunityModerator.ISummary> {
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 100;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const whereInput: Prisma.community_platform_community_moderatorsWhereInput = {
    deleted_at: null,
    ...(props.body.communityId && { community_id: props.body.communityId }),
    ...(props.body.communityModeratorId && {
      community_moderator_id: props.body.communityModeratorId,
    }),
    ...(props.body.role && { role: props.body.role }),
  };
  const moderators =
    await MyGlobal.prisma.community_platform_community_moderators.findMany({
      where: whereInput,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        role: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            ownerUser: {
              select: {
                id: true,
                email: true,
                username: true,
                display_name: true,
                bio: true,
                avatar_url: true,
                karma: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        communityModerator: {
          select: {
            id: true,
            email: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.community_platform_community_moderators.count({
      where: whereInput,
    });
  async function getSubscriberCount(communityId: string): Promise<number> {
    return MyGlobal.prisma.community_platform_community_subscriptions.count({
      where: { community_id: communityId, deleted_at: null },
    });
  }
  const uniqueCommunityIds = Array.from(
    new Set(moderators.map((m) => m.community.id)),
  );
  const subscriberCounts = await Promise.all(
    uniqueCommunityIds.map(getSubscriberCount),
  );
  const communityIdToCount = new Map<string, number>();
  uniqueCommunityIds.forEach((id, idx) => {
    communityIdToCount.set(id, subscriberCounts[idx]);
  });
  return {
    data: await Promise.all(
      moderators.map(async (moderator) => ({
        id: moderator.id as string & tags.Format<"uuid">,
        role: moderator.role,
        createdAt: toISOStringSafe(moderator.created_at) as string &
          tags.Format<"date-time">,
        updatedAt: toISOStringSafe(moderator.updated_at) as string &
          tags.Format<"date-time">,
        deletedAt: moderator.deleted_at
          ? (toISOStringSafe(moderator.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
        community: {
          id: moderator.community.id as string & tags.Format<"uuid">,
          name: moderator.community.name,
          description: moderator.community.description,
          iconUrl: moderator.community.icon_url,
          createdAt: toISOStringSafe(moderator.community.created_at) as string &
            tags.Format<"date-time">,
          updatedAt: toISOStringSafe(moderator.community.updated_at) as string &
            tags.Format<"date-time">,
          deletedAt: moderator.community.deleted_at
            ? (toISOStringSafe(moderator.community.deleted_at) as string &
                tags.Format<"date-time">)
            : null,
          subscriberCount: communityIdToCount.get(moderator.community.id) ?? 0,
          ownerUser: {
            id: moderator.community.ownerUser.id as string &
              tags.Format<"uuid">,
            email: moderator.community.ownerUser.email,
            username: moderator.community.ownerUser.username,
            displayName: moderator.community.ownerUser.display_name,
            bio: moderator.community.ownerUser.bio ?? null,
            avatarUrl: moderator.community.ownerUser.avatar_url ?? null,
            karma: moderator.community.ownerUser.karma,
            createdAt: toISOStringSafe(
              moderator.community.ownerUser.created_at,
            ) as string & tags.Format<"date-time">,
            updatedAt: toISOStringSafe(
              moderator.community.ownerUser.updated_at,
            ) as string & tags.Format<"date-time">,
            deletedAt: moderator.community.ownerUser.deleted_at
              ? (toISOStringSafe(
                  moderator.community.ownerUser.deleted_at,
                ) as string & tags.Format<"date-time">)
              : null,
          },
        },
        communityModerator: {
          id: moderator.communityModerator.id as string & tags.Format<"uuid">,
          email: moderator.communityModerator.email,
          username: moderator.communityModerator.username,
          displayName: moderator.communityModerator.display_name,
          bio: moderator.communityModerator.bio ?? null,
          avatarUrl: moderator.communityModerator.avatar_url ?? null,
          karma: moderator.communityModerator.karma,
          createdAt: toISOStringSafe(
            moderator.communityModerator.created_at,
          ) as string & tags.Format<"date-time">,
          updatedAt: toISOStringSafe(
            moderator.communityModerator.updated_at,
          ) as string & tags.Format<"date-time">,
          deletedAt: moderator.communityModerator.deleted_at
            ? (toISOStringSafe(
                moderator.communityModerator.deleted_at,
              ) as string & tags.Format<"date-time">)
            : null,
        },
      })),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
