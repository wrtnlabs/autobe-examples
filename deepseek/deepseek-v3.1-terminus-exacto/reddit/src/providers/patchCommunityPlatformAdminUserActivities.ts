import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserActivity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformUserActivityAtSummaryTransformer } from "../transformers/CommunityPlatformUserActivityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminUserActivities(props: {
  admin: AdminPayload;
  body: ICommunityPlatformUserActivity.IRequest;
}): Promise<IPageICommunityPlatformUserActivity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.user_id && { user_id: props.body.user_id }),
    ...(props.body.activity_type && {
      activity_type: props.body.activity_type,
    }),
    ...(props.body.content_created !== undefined && {
      content_created: props.body.content_created,
    }),
    ...(props.body.min_engagement_score !== undefined &&
      props.body.min_engagement_score !== null && {
        engagement_score: { gte: props.body.min_engagement_score },
      }),
    ...(props.body.start_date && {
      created_at: { gte: new Date(props.body.start_date) },
    }),
    ...(props.body.end_date && {
      created_at: { lte: new Date(props.body.end_date) },
    }),
  } satisfies Prisma.community_platform_user_activitiesWhereInput;
  const data =
    await MyGlobal.prisma.community_platform_user_activities.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...CommunityPlatformUserActivityAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.community_platform_user_activities.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformUserActivityAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
