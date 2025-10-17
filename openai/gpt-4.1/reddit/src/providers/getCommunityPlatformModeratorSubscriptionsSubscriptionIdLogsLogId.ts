import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSubscriptionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionLog";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getCommunityPlatformModeratorSubscriptionsSubscriptionIdLogsLogId(props: {
  moderator: ModeratorPayload;
  subscriptionId: string & tags.Format<"uuid">;
  logId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSubscriptionLog> {
  // Step 1: Locate the subscription to get member/community linkage
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: { id: props.subscriptionId },
    });
  if (!subscription) throw new HttpException("Subscription not found", 404);

  // Step 2: Verify the moderator is assigned (active) to this community
  const modAssignment =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: subscription.community_id,
        status: "active",
        deleted_at: null,
      },
    });
  if (!modAssignment)
    throw new HttpException(
      "Forbidden: You are not a moderator for this community",
      403,
    );

  // Step 3: Find the log matching logId, member_id, and community_id
  const log =
    await MyGlobal.prisma.community_platform_subscription_logs.findUnique({
      where: { id: props.logId },
    });
  if (
    !log ||
    log.member_id !== subscription.member_id ||
    log.community_id !== subscription.community_id
  )
    throw new HttpException("Subscription log not found", 404);

  return {
    id: log.id,
    member_id: log.member_id,
    community_id: log.community_id,
    event_type: log.event_type,
    event_at: toISOStringSafe(log.event_at),
    ...(log.metadata != null ? { metadata: log.metadata } : {}),
  };
}
