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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSubscriptionActivityAtSummaryTransformer } from "../transformers/CommunityPlatformSubscriptionActivityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminSubscriptionActivities(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSubscriptionActivity.IRequest;
}): Promise<IPageICommunityPlatformSubscriptionActivity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.community_platform_subscription_activitiesWhereInput =
    {
      deleted_at: null,
    };
  if (props.body.member_id !== undefined && props.body.member_id !== null) {
    whereConditions.member_id = props.body.member_id;
  }
  if (
    props.body.community_id !== undefined &&
    props.body.community_id !== null
  ) {
    whereConditions.community_id = props.body.community_id;
  }
  if (props.body.event_type !== undefined && props.body.event_type !== null) {
    whereConditions.event_type = props.body.event_type;
  }
  if (
    props.body.posting_permission_changed !== undefined &&
    props.body.posting_permission_changed !== null
  ) {
    whereConditions.posting_permission_changed =
      props.body.posting_permission_changed;
  }
  if (
    props.body.from_event_time !== undefined &&
    props.body.from_event_time !== null
  ) {
    whereConditions.event_time = {
      ...(whereConditions.event_time as Prisma.DateTimeFilter),
      gte: new Date(props.body.from_event_time),
    };
  }
  if (
    props.body.to_event_time !== undefined &&
    props.body.to_event_time !== null
  ) {
    whereConditions.event_time = {
      ...(whereConditions.event_time as Prisma.DateTimeFilter),
      lte: new Date(props.body.to_event_time),
    };
  }
  const data =
    await MyGlobal.prisma.community_platform_subscription_activities.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { event_time: "desc" as const },
      ...CommunityPlatformSubscriptionActivityAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_platform_subscription_activities.count({
      where: whereConditions,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformSubscriptionActivityAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
