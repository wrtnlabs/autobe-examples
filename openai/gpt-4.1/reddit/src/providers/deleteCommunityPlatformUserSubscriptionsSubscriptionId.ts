import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserSubscriptionsSubscriptionId(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch the subscription record by primary key
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUnique(
      {
        where: { id: props.subscriptionId },
      },
    );
  // 2. Not found
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }
  // 3. Already soft-deleted
  if (subscription.deleted_at !== null) {
    throw new HttpException("Subscription already deleted", 409);
  }
  // 4. Authorization check: must be owner
  if (subscription.user_id !== props.user.id) {
    throw new HttpException("Unauthorized: Not your subscription", 403);
  }
  // 5. Perform soft delete by setting deleted_at (and updated_at)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_community_subscriptions.update({
    where: { id: props.subscriptionId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
