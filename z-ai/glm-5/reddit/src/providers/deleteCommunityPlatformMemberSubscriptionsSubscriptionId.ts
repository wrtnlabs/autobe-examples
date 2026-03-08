import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the subscription
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUniqueOrThrow({
      where: { id: props.subscriptionId },
    });
  // 2. Authorization: verify ownership
  if (subscription.member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden - You do not own this subscription",
      403,
    );
  }
  // 3. Check if already unsubscribed
  if (subscription.is_active === false) {
    throw new HttpException("Conflict - Already unsubscribed", 409);
  }
  // 4. Transaction: deactivate subscription and decrement subscriber count
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_platform_subscriptions.update({
      where: { id: props.subscriptionId },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.community_platform_communities.update({
      where: { id: subscription.community_id },
      data: {
        subscriber_count: {
          decrement: 1,
        },
      },
    }),
  ]);
}
