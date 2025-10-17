import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSubscriptionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionLog";
import { IPageICommunityPlatformSubscriptionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscriptionLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorSubscriptionsSubscriptionIdLogs(props: {
  moderator: ModeratorPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSubscriptionLog.IRequest;
}): Promise<IPageICommunityPlatformSubscriptionLog.ISummary> {
  // 1. Find subscription using the given subscriptionId
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: { id: props.subscriptionId },
    });
  if (!subscription) throw new HttpException("Subscription not found", 404);

  // 2. Extract paging/filter parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "event_at";
  const sortOrder = props.body.sort_order ?? "desc";

  // 3. Build where filters
  const where = {
    member_id: subscription.member_id,
    community_id: subscription.community_id,
    ...(props.body.event_type !== undefined &&
      props.body.event_type !== null && { event_type: props.body.event_type }),
    ...((props.body.start_date !== undefined &&
      props.body.start_date !== null) ||
    (props.body.end_date !== undefined && props.body.end_date !== null)
      ? {
          event_at: {
            ...(props.body.start_date !== undefined &&
              props.body.start_date !== null && { gte: props.body.start_date }),
            ...(props.body.end_date !== undefined &&
              props.body.end_date !== null && { lte: props.body.end_date }),
          },
        }
      : {}),
    ...(props.body.metadata_query !== undefined &&
      props.body.metadata_query !== null && {
        metadata: { contains: props.body.metadata_query },
      }),
  };

  // 4. Query logs and count in parallel
  const [logs, total] = await Promise.all([
    MyGlobal.prisma.community_platform_subscription_logs.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_subscription_logs.count({ where }),
  ]);

  // 5. Format and return result per ISummary DTO
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: logs.map((log) => ({
      id: log.id,
      member_id: log.member_id,
      community_id: log.community_id,
      event_type: log.event_type,
      event_at: toISOStringSafe(log.event_at),
    })),
  };
}
