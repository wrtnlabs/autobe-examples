import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserSubscriptions(props: {
  user: UserPayload;
  body: ICommunityPlatformCommunitySubscription.IRequest;
}): Promise<IPageICommunityPlatformCommunitySubscription.ISummary> {
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 100;
  const skip = (page - 1) * limit;
  const whereSubscription: Prisma.community_platform_community_subscriptionsWhereInput =
    {
      user_id: props.user.id,
      deleted_at: null,
      community: {
        deleted_at: null,
        ...(props.body.communityName
          ? {
              name: { contains: props.body.communityName, mode: "insensitive" },
            }
          : {}),
      },
    };
  const total =
    await MyGlobal.prisma.community_platform_community_subscriptions.count({
      where: whereSubscription,
    });
  const subscriptions =
    await MyGlobal.prisma.community_platform_community_subscriptions.findMany({
      where: whereSubscription,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        community: {
          include: {
            ownerUser: true,
          },
        },
      },
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: subscriptions.map((sub) => ({
      id: sub.id as string & tags.Format<"uuid">,
      community: {
        id: sub.community.id as string & tags.Format<"uuid">,
        name: sub.community.name,
        description: sub.community.description,
        iconUrl: sub.community.icon_url,
        subscriberCount: 0, // Fallback as subscriber count not available
        ownerUser: {
          id: sub.community.ownerUser.id as string & tags.Format<"uuid">,
          email: sub.community.ownerUser.email,
          username: sub.community.ownerUser.username,
          displayName: sub.community.ownerUser.display_name,
          bio: sub.community.ownerUser.bio ?? undefined,
          avatarUrl: sub.community.ownerUser.avatar_url ?? undefined,
          karma: sub.community.ownerUser.karma,
          createdAt: toISOStringSafe(sub.community.ownerUser.created_at),
          updatedAt: toISOStringSafe(sub.community.ownerUser.updated_at),
          deletedAt: sub.community.ownerUser.deleted_at
            ? toISOStringSafe(sub.community.ownerUser.deleted_at)
            : null,
        },
        createdAt: toISOStringSafe(sub.community.created_at),
        updatedAt: toISOStringSafe(sub.community.updated_at),
        deletedAt: sub.community.deleted_at
          ? toISOStringSafe(sub.community.deleted_at)
          : null,
      },
      createdAt: toISOStringSafe(sub.created_at),
      updatedAt: toISOStringSafe(sub.updated_at),
      deletedAt: sub.deleted_at ? toISOStringSafe(sub.deleted_at) : null,
    })) as ICommunityPlatformCommunitySubscription.ISummary[],
  };
}
