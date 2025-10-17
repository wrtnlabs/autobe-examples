import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPortalMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, subscriptionId } = props;

  const subscription =
    await MyGlobal.prisma.community_portal_subscriptions.findUnique({
      where: { id: subscriptionId },
      select: { id: true, user_id: true, deleted_at: true },
    });

  if (!subscription) {
    throw new HttpException("Not Found", 404);
  }

  if (subscription.user_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only revoke your own subscription",
      403,
    );
  }

  if (subscription.deleted_at) return;

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.community_portal_subscriptions.update({
    where: { id: subscriptionId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // Optional: publish an event for downstream cache/feed invalidation, e.g.:
  // if (MyGlobal.eventBus) await MyGlobal.eventBus.publish('subscription.revoked', { subscriptionId, userId: member.id, revoked_at: now });
}
