import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getCommunityPlatformMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSubscription> {
  const { member, subscriptionId } = props;
  // Fetch the subscription by id
  const record =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: { id: subscriptionId },
    });
  if (!record) {
    throw new HttpException("Subscription not found", 404);
  }
  // Only the owner can view
  if (record.member_id !== member.id) {
    throw new HttpException("Forbidden: You do not own this subscription", 403);
  }
  return {
    id: record.id,
    member_id: record.member_id,
    community_id: record.community_id,
    created_at: toISOStringSafe(record.created_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
