import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminSubscriptionsSubscriptionId(props: {
  admin: AdminPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSubscription.IUpdate;
}): Promise<ICommunityPlatformSubscription> {
  const { subscriptionId, body } = props;

  // 1. Lookup the subscription
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: { id: subscriptionId },
    });
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }

  // 2. Update deleted_at (only field updatable)
  const updated = await MyGlobal.prisma.community_platform_subscriptions.update(
    {
      where: { id: subscriptionId },
      data: {
        // Only update if provided
        deleted_at: body.deleted_at !== undefined ? body.deleted_at : undefined,
      },
    },
  );

  // 3. Return all required fields (convert date fields)
  return {
    id: updated.id,
    member_id: updated.member_id,
    community_id: updated.community_id,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : updated.deleted_at,
  };
}
