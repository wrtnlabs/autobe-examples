import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityPlatformUserCommunitySubscriptionsSubscriptionId(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunitySubscription> {
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUnique(
      {
        where: { id: props.subscriptionId },
        select: {
          id: true,
          community_id: true,
          user_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }
  if (subscription.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: subscription.id,
    community_id: subscription.community_id,
    user_id: subscription.user_id,
    created_at: toISOStringSafe(subscription.created_at),
    updated_at: toISOStringSafe(subscription.updated_at),
    deleted_at: subscription.deleted_at
      ? toISOStringSafe(subscription.deleted_at)
      : null,
  };
}
