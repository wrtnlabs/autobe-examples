import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function postCommunityPlatformUserCommunitySubscriptions(props: {
  user: UserPayload;
  body: ICommunityPlatformCommunitySubscription.ICreate;
}): Promise<ICommunityPlatformCommunitySubscription> {
  const now = toISOStringSafe(new Date());
  // 1. Find community, ensure exists and not deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.body.community_id, deleted_at: null },
    });
  if (!community) {
    throw new HttpException("Community not found or has been deleted.", 404);
  }

  // 2. Find existing subscription (for current user/community)
  const existing =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: { user_id: props.user.id, community_id: props.body.community_id },
    });
  if (existing && existing.deleted_at === null) {
    throw new HttpException("Already subscribed to this community.", 409);
  }

  let subscription;
  if (existing && existing.deleted_at !== null) {
    // 3. Restore soft-deleted subscription
    subscription =
      await MyGlobal.prisma.community_platform_community_subscriptions.update({
        where: { id: existing.id },
        data: {
          deleted_at: null,
          updated_at: now,
        },
      });
  } else if (!existing) {
    // 4. Create fresh subscription
    subscription =
      await MyGlobal.prisma.community_platform_community_subscriptions.create({
        data: {
          id: v4(),
          user_id: props.user.id,
          community_id: props.body.community_id,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
  }

  if (!subscription) {
    throw new HttpException("Could not create or restore subscription.", 500);
  }

  // 5. Compose API response: get user & community summary
  const userSummary = { id: props.user.id };
  const communitySummary = {
    id: community.id,
    name: community.name,
    display_title: community.display_title,
    description: community.description,
    visibility: community.visibility,
    image_url: community.image_url ?? undefined,
    status: community.status,
  };
  return {
    id: subscription.id,
    user: userSummary,
    community: communitySummary,
    created_at: toISOStringSafe(subscription.created_at),
    updated_at: toISOStringSafe(subscription.updated_at),
    deleted_at:
      subscription.deleted_at === null
        ? undefined
        : toISOStringSafe(subscription.deleted_at),
  };
}
