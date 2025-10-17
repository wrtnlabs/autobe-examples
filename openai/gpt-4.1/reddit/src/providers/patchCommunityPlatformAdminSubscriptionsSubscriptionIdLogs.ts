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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminSubscriptionsSubscriptionIdLogs(props: {
  admin: AdminPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSubscriptionLog.IRequest;
}): Promise<IPageICommunityPlatformSubscriptionLog.ISummary> {
  const { subscriptionId, body } = props;

  // Fetch the subscription (to obtain member_id and community_id)
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: { id: subscriptionId },
      select: { member_id: true, community_id: true },
    });
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Date range condition
  let eventAtCond:
    | undefined
    | {
        gte?: string & tags.Format<"date-time">;
        lte?: string & tags.Format<"date-time">;
      } = undefined;
  if (body.start_date !== undefined && body.end_date !== undefined) {
    eventAtCond = { gte: body.start_date, lte: body.end_date };
  } else if (body.start_date !== undefined) {
    eventAtCond = { gte: body.start_date };
  } else if (body.end_date !== undefined) {
    eventAtCond = { lte: body.end_date };
  }

  // Build query filters only if value present
  const where = {
    member_id: subscription.member_id,
    community_id: subscription.community_id,
    ...(body.event_type !== undefined && { event_type: body.event_type }),
    ...(eventAtCond && { event_at: eventAtCond }),
    ...(body.metadata_query !== undefined && {
      metadata: { contains: body.metadata_query },
    }),
  };

  // Sorting logic
  let orderBy: { [key: string]: "asc" | "desc" };
  if (body.sort_by === "event_type") {
    orderBy = { event_type: body.sort_order === "asc" ? "asc" : "desc" };
  } else {
    orderBy = { event_at: body.sort_order === "asc" ? "asc" : "desc" };
  }

  const [logs, total] = await Promise.all([
    MyGlobal.prisma.community_platform_subscription_logs.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        member_id: true,
        community_id: true,
        event_type: true,
        event_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_subscription_logs.count({ where }),
  ]);

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
