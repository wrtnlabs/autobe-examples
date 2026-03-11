import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunityAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityAnalytic";
import { IRedditPlatformCommunityAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminAnalyticsCommunities(props: {
  admin: AdminPayload;
  body: IRedditPlatformCommunityAnalytic.IRequest;
}): Promise<IPageIRedditPlatformCommunityAnalytic.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build community filters
  const communityWhere: Prisma.reddit_platform_communitiesWhereInput = {
    deleted_at: null,
    ...(props.body.subscriberCountMin !== undefined && {
      subscriber_count: { gte: props.body.subscriberCountMin },
    }),
    ...(props.body.subscriberCountMax !== undefined && {
      subscriber_count: { lte: props.body.subscriberCountMax },
    }),
  } satisfies Prisma.reddit_platform_communitiesWhereInput;
  // Build report filters for conditional aggregations
  const reportFilterConditions: Prisma.reddit_platform_reportsWhereInput[] = [];
  // Status filter
  if (props.body.status !== undefined) {
    reportFilterConditions.push({ status: props.body.status });
  }
  // Date range filter
  if (props.body.startDate !== undefined || props.body.endDate !== undefined) {
    const dateConditions: Prisma.reddit_platform_reportsWhereInput[] = [];
    if (props.body.startDate !== undefined) {
      dateConditions.push({
        OR: [
          { created_at: { gte: props.body.startDate } },
          { updated_at: { gte: props.body.startDate } },
        ],
      });
    }
    if (props.body.endDate !== undefined) {
      dateConditions.push({
        OR: [
          { created_at: { lte: props.body.endDate } },
          { updated_at: { lte: props.body.endDate } },
        ],
      });
    }
    reportFilterConditions.push({ AND: dateConditions });
  }
  const reportFilter: Prisma.reddit_platform_reportsWhereInput =
    reportFilterConditions.length > 0 ? { AND: reportFilterConditions } : {};
  // Fetch communities with their report aggregates using Prisma
  const communities =
    await MyGlobal.prisma.reddit_platform_communities.findMany({
      where: communityWhere,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        subscriber_count: true,
        reports: {
          where: reportFilter,
          select: {
            status: true,
          },
        },
      },
    });
  const total = await MyGlobal.prisma.reddit_platform_communities.count({
    where: communityWhere,
  });
  // Transform communities to analytics summaries
  const data = await ArrayUtil.asyncMap(communities, async (community) => {
    const totalReports = community.reports.length;
    const resolvedReports = community.reports.filter(
      (r) => r.status === "RESOLVED",
    ).length;
    const dismissedReports = community.reports.filter(
      (r) => r.status === "DISMISSED",
    ).length;
    const resolutionRate =
      totalReports > 0 ? resolvedReports / totalReports : null;
    return {
      community_id: community.id as string & tags.Format<"uuid">,
      community_name: community.name,
      total_reports: totalReports as number & tags.Type<"int32">,
      resolved_reports: resolvedReports as number & tags.Type<"int32">,
      dismissed_reports: dismissedReports as number & tags.Type<"int32">,
      resolution_rate: resolutionRate as number | null,
      subscriber_count: community.subscriber_count as number &
        tags.Type<"int32">,
    } satisfies IRedditPlatformCommunityAnalytic.ISummary;
  });
  return {
    data,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  };
}
