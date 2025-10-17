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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchCommunityPlatformMemberSubscriptionsSubscriptionIdLogs(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSubscriptionLog.IRequest;
}): Promise<IPageICommunityPlatformSubscriptionLog.ISummary> {
  const { member, subscriptionId, body } = props;
  // 1. Fetch subscription, validate member_id matches
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: { id: subscriptionId },
    });
  if (!subscription || subscription.member_id !== member.id) {
    throw new HttpException(
      "You do not have permission to access these logs.",
      403,
    );
  }
  // 2. Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  // 3. Build filters
  const where = {
    member_id: subscription.member_id,
    community_id: subscription.community_id,
    ...(body.event_type !== undefined && { event_type: body.event_type }),
    ...(body.start_date !== undefined && body.end_date !== undefined
      ? {
          event_at: {
            gte: body.start_date,
            lte: body.end_date,
          },
        }
      : body.start_date !== undefined
        ? {
            event_at: { gte: body.start_date },
          }
        : body.end_date !== undefined
          ? {
              event_at: { lte: body.end_date },
            }
          : {}),
    ...(body.metadata_query !== undefined &&
      body.metadata_query !== "" && {
        metadata: { contains: body.metadata_query },
      }),
  };
  const orderBy =
    (body.sort_by === "event_at" || body.sort_by === "event_type") &&
    (body.sort_order === "asc" || body.sort_order === "desc")
      ? { [body.sort_by]: body.sort_order as Prisma.SortOrder }
      : { event_at: "desc" as Prisma.SortOrder };
  // 4. Query and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_subscription_logs.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_subscription_logs.count({ where }),
  ]);
  // 5. Map to ISummary
  const data = rows.map((row) => ({
    id: row.id,
    member_id: row.member_id,
    community_id: row.community_id,
    event_type: row.event_type,
    event_at: toISOStringSafe(row.event_at),
  }));
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
