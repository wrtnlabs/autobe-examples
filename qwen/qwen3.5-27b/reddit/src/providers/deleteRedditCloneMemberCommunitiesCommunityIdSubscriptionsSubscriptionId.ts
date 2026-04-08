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

export async function deleteRedditCloneMemberCommunitiesCommunityIdSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the subscription and validate it exists
  const subscription =
    await MyGlobal.prisma.reddit_clone_community_subscriptions.findUniqueOrThrow(
      {
        where: { id: props.subscriptionId },
        select: {
          id: true,
          reddit_clone_member_id: true,
          reddit_clone_community_id: true,
          deleted_at: true,
        },
      },
    );
  // Validate subscription is not already deleted
  if (subscription.deleted_at !== null) {
    throw new HttpException("Subscription already deleted", 404);
  }
  // Validate ownership - subscription must belong to authenticated member
  if (subscription.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate community_id matches the provided communityId
  if (subscription.reddit_clone_community_id !== props.communityId) {
    throw new HttpException("Subscription not found", 404);
  }
  // Validate community exists and is not deleted
  await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
  });
  // Soft delete the subscription
  await MyGlobal.prisma.reddit_clone_community_subscriptions.update({
    where: { id: props.subscriptionId },
    data: { deleted_at: new Date() },
  });
}
