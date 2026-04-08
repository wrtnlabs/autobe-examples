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

export async function deleteRedditCommunityMemberMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const subscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findUnique({
      where: { id: props.subscriptionId },
      select: {
        id: true,
        member_id: true,
        deleted_at: true,
      },
    });
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }
  if (subscription.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (subscription.deleted_at !== null) {
    throw new HttpException("Subscription already cancelled", 400);
  }
  await MyGlobal.prisma.reddit_community_subscriptions.update({
    where: { id: props.subscriptionId },
    data: {
      deleted_at: new Date(),
    },
  });
}
