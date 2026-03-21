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

export async function deleteRedditCloneMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the subscription by ID
  const subscription =
    await MyGlobal.prisma.reddit_clone_subscriptions.findUnique({
      where: { id: props.subscriptionId },
      select: {
        id: true,
        reddit_clone_member_id: true,
      },
    });
  // Verify subscription exists
  if (subscription === null) {
    throw new HttpException("Not Found", 404);
  }
  // Verify subscription belongs to authenticated member
  if (subscription.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the subscription
  await MyGlobal.prisma.reddit_clone_subscriptions.delete({
    where: { id: props.subscriptionId },
  });
}
