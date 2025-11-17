import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function getRedditCommunityRegisteredUserRedditCommunityCommunitiesCommunityNameCommunitySubscriptionsCommunitySubscriptionId(props: {
  registeredUser: RegistereduserPayload;
  communityName: string;
  communitySubscriptionId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunitySubscription> {
  const subscription =
    await MyGlobal.prisma.reddit_community_community_subscriptions.findFirst({
      where: {
        id: props.communitySubscriptionId,
        registereduser_id: props.registeredUser.id,
        community: {
          name: props.communityName,
          deleted_at: null,
        },
        deleted_at: null,
      },
      include: {
        registereduser: true,
        community: true,
      },
    });

  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }

  return {
    id: subscription.id,
    registereduser: {
      id: subscription.registereduser.id,
      email: subscription.registereduser.email,
      created_at: toISOStringSafe(subscription.registereduser.created_at),
      updated_at: toISOStringSafe(subscription.registereduser.updated_at),
      deleted_at: subscription.registereduser.deleted_at
        ? toISOStringSafe(subscription.registereduser.deleted_at)
        : null,
    },
    community: {
      id: subscription.community.id,
      name: subscription.community.name,
      title: subscription.community.title,
      description: subscription.community.description ?? null,
      creator_id: subscription.community.creator_id,
      created_at: toISOStringSafe(subscription.community.created_at),
      updated_at: toISOStringSafe(subscription.community.updated_at),
      deleted_at: subscription.community.deleted_at
        ? toISOStringSafe(subscription.community.deleted_at)
        : null,
    },
    created_at: toISOStringSafe(subscription.created_at),
    deleted_at: subscription.deleted_at
      ? toISOStringSafe(subscription.deleted_at)
      : null,
  };
}
