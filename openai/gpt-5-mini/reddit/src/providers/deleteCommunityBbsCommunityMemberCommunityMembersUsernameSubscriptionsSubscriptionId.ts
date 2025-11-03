import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function deleteCommunityBbsCommunityMemberCommunityMembersUsernameSubscriptionsSubscriptionId(props: {
  communityMember: CommunitymemberPayload;
  username: string;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { communityMember, username, subscriptionId } = props;

  // Resolve member by username
  const member = await MyGlobal.prisma.community_bbs_communitymember.findUnique(
    { where: { username } },
  );
  if (!member) throw new HttpException("Not Found", 404);

  // Load subscription with its community
  const subscription =
    await MyGlobal.prisma.community_bbs_user_subscriptions.findUnique({
      where: { id: subscriptionId },
      include: { community: true },
    });
  if (!subscription) throw new HttpException("Not Found", 404);

  // Authorization: only the owner (resolved by username) may perform this action
  if (communityMember.id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own subscriptions",
      403,
    );
  }

  // Confirm ownership of the subscription row
  if (subscription.community_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: Subscription does not belong to the specified user",
      403,
    );
  }

  // Idempotent handling: if already soft-deleted, return silently
  if (subscription.deleted_at !== null) return;

  const now = toISOStringSafe(new Date());

  // Build transaction operations ensuring each entry is a Prisma promise
  const txOperations: Array<Prisma.PrismaPromise<any>> = [
    MyGlobal.prisma.community_bbs_user_subscriptions.update({
      where: { id: subscriptionId },
      data: {
        deleted_at: now,
        is_active: false,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.community_bbs_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_type: "community_member",
        actor_id: communityMember.id,
        entity: "subscription",
        action: "erase_subscription",
        payload: JSON.stringify({ subscription_id: subscriptionId }),
        created_at: now,
        updated_at: now,
      },
    }),
  ];

  if (subscription.community) {
    txOperations.push(
      MyGlobal.prisma.community_bbs_communities.update({
        where: { id: subscription.community_id },
        data: {
          members_count:
            (subscription.community.members_count ?? 0) > 0
              ? (subscription.community.members_count ?? 0) - 1
              : 0,
          updated_at: now,
        },
      }),
    );
  }

  // Use transaction to ensure atomicity of update + audit + cache update
  await MyGlobal.prisma.$transaction(txOperations);

  // Optional event emission (commented placeholder)
  // MyGlobal.eventBus?.publish?.('subscription.changed', { subscriptionId, action: 'erased', occurred_at: now });

  return;
}
