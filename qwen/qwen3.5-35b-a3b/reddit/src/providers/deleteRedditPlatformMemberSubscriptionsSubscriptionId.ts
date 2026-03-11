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
  // Find the subscription and verify it exists and is not already deleted
  await MyGlobal.prisma.reddit_platform_community_subscriptions.findUniqueOrThrow(
    {
      where: {
        id: props.subscriptionId,
        deleted_at: null,
      },
    },
  );
  // Verify ownership - only the subscription owner can delete it
  const subscription =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findFirst({
      where: {
        id: props.subscriptionId,
        deleted_at: null,
      },
      select: {
        reddit_platform_member_id: true,
      },
    });
  if (
    subscription === null ||
    subscription.reddit_platform_member_id !== props.member.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.reddit_platform_community_subscriptions.update({
    where: { id: props.subscriptionId },
    data: {
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
}
