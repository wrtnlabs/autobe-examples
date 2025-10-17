import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSubscriptionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminSubscriptionsSubscriptionIdLogsLogId(props: {
  admin: AdminPayload;
  subscriptionId: string & tags.Format<"uuid">;
  logId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSubscriptionLog> {
  // Fetch the subscription parent context
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: { id: props.subscriptionId },
    });
  if (!subscription) throw new HttpException("Subscription not found", 404);
  // Now fetch the log record and check it matches the subscription
  const log =
    await MyGlobal.prisma.community_platform_subscription_logs.findUnique({
      where: { id: props.logId },
    });
  if (
    !log ||
    log.member_id !== subscription.member_id ||
    log.community_id !== subscription.community_id
  ) {
    throw new HttpException("Log not found for this subscription", 404);
  }
  return {
    id: log.id,
    member_id: log.member_id,
    community_id: log.community_id,
    event_type: log.event_type,
    event_at: toISOStringSafe(log.event_at),
    metadata: log.metadata ?? undefined,
  };
}
