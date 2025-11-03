import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminSubscriptionsSubscriptionId(props: {
  admin: AdminPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { subscriptionId } = props;
  // Find subscription by id and ensure not already deleted
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUnique(
      {
        where: { id: subscriptionId },
      },
    );
  if (subscription === null || subscription.deleted_at !== null) {
    throw new HttpException("Subscription not found or already deleted", 404);
  }
  // Soft-delete by marking deleted_at
  await MyGlobal.prisma.community_platform_community_subscriptions.update({
    where: { id: subscriptionId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
