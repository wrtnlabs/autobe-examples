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

  // Verify subscription exists and belongs to the authenticated member
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: {
        id: subscriptionId,
        community_platform_member_id: member.id,
      },
    });

  // If subscription not found or does not belong to member, return 404
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }

  // Permanently delete the subscription record
  await MyGlobal.prisma.community_platform_subscriptions.delete({
    where: {
      id: subscriptionId,
    },
  });
}
