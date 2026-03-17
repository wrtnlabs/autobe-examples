import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { ICommunityPlatformSubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformSubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscriptionSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSubscriptionSnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformSubscriptionSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminSubscriptionSnapshots(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSubscriptionSnapshot.IRequest;
}): Promise<IPageICommunityPlatformSubscriptionSnapshot.ISummary> {
  // Admin authorization is implicit via decorator
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions from filter parameters
  const whereInput = {
    AND: [
      // Date range filters
      ...(props.body.subscribed_at_start !== undefined &&
      props.body.subscribed_at_start !== null
        ? [{ subscribed_at: { gte: new Date(props.body.subscribed_at_start) } }]
        : []),
      ...(props.body.subscribed_at_end !== undefined &&
      props.body.subscribed_at_end !== null
        ? [{ subscribed_at: { lte: new Date(props.body.subscribed_at_end) } }]
        : []),
      ...(props.body.unsubscribed_at_start !== undefined &&
      props.body.unsubscribed_at_start !== null
        ? [
            {
              unsubscribed_at: {
                gte: new Date(props.body.unsubscribed_at_start),
              },
            },
          ]
        : []),
      ...(props.body.unsubscribed_at_end !== undefined &&
      props.body.unsubscribed_at_end !== null
        ? [
            {
              unsubscribed_at: {
                lte: new Date(props.body.unsubscribed_at_end),
              },
            },
          ]
        : []),
      ...(props.body.created_at_start !== undefined &&
      props.body.created_at_start !== null
        ? [{ created_at: { gte: new Date(props.body.created_at_start) } }]
        : []),
      ...(props.body.created_at_end !== undefined &&
      props.body.created_at_end !== null
        ? [{ created_at: { lte: new Date(props.body.created_at_end) } }]
        : []),
      // Direct value filters
      ...(props.body.user_id !== undefined && props.body.user_id !== null
        ? [{ user_id: props.body.user_id }]
        : []),
      ...(props.body.community_id !== undefined &&
      props.body.community_id !== null
        ? [{ community_id: props.body.community_id }]
        : []),
      ...(props.body.community_platform_subscription_id !== undefined &&
      props.body.community_platform_subscription_id !== null
        ? [
            {
              community_platform_subscription_id:
                props.body.community_platform_subscription_id,
            },
          ]
        : []),
      ...(props.body.status !== undefined && props.body.status !== null
        ? [{ status: props.body.status }]
        : []),
      ...(props.body.posting_permission_granted !== undefined &&
      props.body.posting_permission_granted !== null
        ? [
            {
              posting_permission_granted: props.body.posting_permission_granted,
            },
          ]
        : []),
      ...(props.body.feed_included !== undefined &&
      props.body.feed_included !== null
        ? [{ feed_included: props.body.feed_included }]
        : []),
    ],
  } satisfies Prisma.community_platform_subscription_snapshotsWhereInput;
  // Determine sort order
  const orderByInput = (
    props.body.sort === "subscribed_at"
      ? { subscribed_at: "desc" as const }
      : props.body.sort === "unsubscribed_at"
        ? { unsubscribed_at: "desc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.community_platform_subscription_snapshotsOrderByWithRelationInput;
  // Execute paginated query with transformer select
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_subscription_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformSubscriptionSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_subscription_snapshots.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformSubscriptionSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
