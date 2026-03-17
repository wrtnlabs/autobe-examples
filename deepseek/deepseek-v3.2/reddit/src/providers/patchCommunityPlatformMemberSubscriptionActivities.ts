import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { ICommunityPlatformSubscriptionActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformSubscriptionActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscriptionActivity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformSubscriptionActivityAtSummaryTransformer } from "../transformers/CommunityPlatformSubscriptionActivityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberSubscriptionActivities(props: {
  member: MemberPayload;
  body: ICommunityPlatformSubscriptionActivity.IRequest;
}): Promise<IPageICommunityPlatformSubscriptionActivity.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions for filtering
  const whereInput = {
    deleted_at: null,
    member_id: props.body.member_id ?? props.member.id, // Members can only access their own activities
    ...(props.body.community_id && { community_id: props.body.community_id }),
    ...(props.body.event_type && { event_type: props.body.event_type }),
    ...(props.body.posting_permission_changed !== undefined &&
      props.body.posting_permission_changed !== null && {
        posting_permission_changed: props.body.posting_permission_changed,
      }),
    ...(props.body.from_event_time && {
      event_time: {
        gte: new Date(props.body.from_event_time),
      },
    }),
    ...(props.body.to_event_time && {
      event_time: {
        lte: new Date(props.body.to_event_time),
      },
    }),
  } satisfies Prisma.community_platform_subscription_activitiesWhereInput;
  // Default ordering by event_time descending (newest first)
  const orderByInput = (
    props.body.sort === "event_time_asc"
      ? { event_time: "asc" as const }
      : { event_time: "desc" as const }
  ) satisfies Prisma.community_platform_subscription_activitiesOrderByWithRelationInput;
  // Execute paginated query using transformer's select
  const data =
    await MyGlobal.prisma.community_platform_subscription_activities.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...CommunityPlatformSubscriptionActivityAtSummaryTransformer.select(),
    });
  // Count total matching records
  const total =
    await MyGlobal.prisma.community_platform_subscription_activities.count({
      where: whereInput,
    });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformSubscriptionActivityAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
    } satisfies IPage.IPagination,
  };
}
