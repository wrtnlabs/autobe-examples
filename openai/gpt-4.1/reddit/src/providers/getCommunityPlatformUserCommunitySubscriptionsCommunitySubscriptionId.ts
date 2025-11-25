import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserCommunitySubscriptionsCommunitySubscriptionId(props: {
  user: UserPayload;
  communitySubscriptionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunitySubscription> {
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUnique(
      {
        where: { id: props.communitySubscriptionId },
      },
    );
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: subscription.user_id },
  });
  if (!user) {
    throw new HttpException("User referenced by subscription not found", 500);
  }
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: subscription.community_id },
    });
  if (!community) {
    throw new HttpException(
      "Community referenced by subscription not found",
      500,
    );
  }
  return {
    id: subscription.id,
    user: {
      id: user.id,
    },
    community: {
      id: community.id,
      name: community.name,
      display_title: community.display_title,
      description: community.description,
      visibility: community.visibility,
      image_url: community.image_url === null ? undefined : community.image_url,
      status: community.status,
    },
    created_at: toISOStringSafe(subscription.created_at),
    updated_at: toISOStringSafe(subscription.updated_at),
    deleted_at: subscription.deleted_at
      ? toISOStringSafe(subscription.deleted_at)
      : undefined,
  };
}
