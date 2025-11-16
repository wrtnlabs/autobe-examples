import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function getRedditCommunityRegisteredUserRedditCommunitySubscriptionsId(props: {
  registeredUser: RegisteredUserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditCommunitySubscription> {
  const subscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findUnique({
      where: { id: props.id },
    });

  if (!subscription) {
    throw new HttpException("Reddit Community Subscription not found", 404);
  }

  const registeredUser =
    await MyGlobal.prisma.reddit_community_registered_users.findUnique({
      where: { id: subscription.reddit_community_registered_user_id },
    });

  if (!registeredUser) {
    throw new HttpException("Registered user not found", 404);
  }

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: subscription.reddit_community_community_id },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  return {
    id: subscription.id,
    registeredUser: {
      id: registeredUser.id,
      username: registeredUser.email,
    },
    community: {
      id: community.id,
      communityName: community.name,
      status: community.status,
      creator_id: community.creator_id,
    },
    created_at: toISOStringSafe(subscription.created_at),
    updated_at: subscription.updated_at
      ? toISOStringSafe(subscription.updated_at)
      : undefined,
  };
}
