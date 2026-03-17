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

export async function deleteRedditPlatformMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the subscription record
  const subscription =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findUnique({
      where: { id: props.subscriptionId },
      select: {
        id: true,
        member_id: true,
        community_id: true,
        deleted_at: true,
      },
    });
  // Check if subscription exists
  if (subscription === null) {
    throw new HttpException("Subscription not found", 404);
  }
  // Check if already deleted
  if (subscription.deleted_at !== null) {
    throw new HttpException("Subscription not found", 404);
  }
  // Validate ownership
  if (subscription.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Perform soft delete and decrement subscriber count in transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_platform_community_subscriptions.update({
      where: { id: props.subscriptionId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.reddit_platform_communities.update({
      where: { id: subscription.community_id },
      data: {
        subscriber_count: {
          decrement: 1,
        },
        updated_at: new Date(),
      },
    }),
  ]);
}
