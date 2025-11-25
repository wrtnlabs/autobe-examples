import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function putRedditCommunityRegisteredUserRedditCommunityCommunitiesCommunityNameCommunitySubscriptionsCommunitySubscriptionId(props: {
  registeredUser: RegistereduserPayload;
  communityName: string;
  communitySubscriptionId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunitySubscription.IUpdate;
}): Promise<IRedditCommunityCommunitySubscription> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName, deleted_at: null },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const subscription =
    await MyGlobal.prisma.reddit_community_community_subscriptions.findUnique({
      where: { id: props.communitySubscriptionId },
    });

  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }

  if (subscription.registereduser_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated =
    await MyGlobal.prisma.reddit_community_community_subscriptions.update({
      where: { id: props.communitySubscriptionId },
      data: {
        deleted_at: props.body.deleted_at ?? null,
      },
      include: {
        registereduser: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            title: true,
            description: true,
            creator_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });

  return {
    id: updated.id,
    registereduser: {
      id: updated.registereduser.id,
      email: updated.registereduser.email,
      created_at: toISOStringSafe(updated.registereduser.created_at),
      updated_at: toISOStringSafe(updated.registereduser.updated_at),
      deleted_at: updated.registereduser.deleted_at
        ? toISOStringSafe(updated.registereduser.deleted_at)
        : null,
    },
    community: {
      id: updated.community.id,
      name: updated.community.name,
      title: updated.community.title,
      description: updated.community.description ?? null,
      creator_id: updated.community.creator_id,
      created_at: toISOStringSafe(updated.community.created_at),
      updated_at: toISOStringSafe(updated.community.updated_at),
      deleted_at: updated.community.deleted_at
        ? toISOStringSafe(updated.community.deleted_at)
        : null,
    },
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
