import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPlatformMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, subscriptionId } = props;

  // Step 1: Retrieve subscription (ensure not deleted)
  const record =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: { id: subscriptionId },
    });
  if (!record) throw new HttpException("Subscription not found", 404);
  if (record.deleted_at !== null)
    throw new HttpException("Subscription is already unsubscribed", 409);
  if (record.member_id !== member.id)
    throw new HttpException("Forbidden: Not your subscription", 403);

  // Step 2: Soft delete (set deleted_at)
  await MyGlobal.prisma.community_platform_subscriptions.update({
    where: { id: subscriptionId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });

  // Step 3: Log unsubscribe event (for audit)
  await MyGlobal.prisma.community_platform_subscription_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member_id: record.member_id,
      community_id: record.community_id,
      event_type: "unsubscribe",
      event_at: toISOStringSafe(new Date()),
      metadata: null,
    },
  });
  return;
}
