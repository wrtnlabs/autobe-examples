import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSubscriptionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionLog";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getCommunityPlatformMemberSubscriptionsSubscriptionIdLogsLogId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
  logId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSubscriptionLog> {
  // Check that subscription exists and is owned by the member (and not deleted)
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findFirst({
      where: {
        id: props.subscriptionId,
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!subscription) {
    throw new HttpException(
      "Not Found: No such subscription or unauthorized",
      404,
    );
  }
  // Find the log that matches logId and this subscription's context
  const log =
    await MyGlobal.prisma.community_platform_subscription_logs.findFirst({
      where: {
        id: props.logId,
        member_id: subscription.member_id,
        community_id: subscription.community_id,
      },
    });
  if (!log) {
    throw new HttpException(
      "Not Found: Log event does not exist for this subscription",
      404,
    );
  }
  return {
    id: log.id,
    member_id: log.member_id,
    community_id: log.community_id,
    event_type: log.event_type,
    event_at: toISOStringSafe(log.event_at),
    metadata: log.metadata === null ? undefined : log.metadata,
  };
}
