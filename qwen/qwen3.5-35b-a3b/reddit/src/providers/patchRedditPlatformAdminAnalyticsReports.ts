import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReportAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportAnalytic";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReportAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportAnalytic";
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

export async function patchRedditPlatformAdminAnalyticsReports(props: {
  admin: AdminPayload;
  body: IRedditPlatformReportAnalytic.IRequest;
}): Promise<IPageIRedditPlatformReportAnalytic.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const whereConditions: Prisma.reddit_platform_reportsWhereInput = {
    deleted_at: null,
  };
  if (props.body.status && props.body.status !== "ALL") {
    whereConditions.status = props.body.status;
  }
  if (props.body.content_type) {
    whereConditions.reported_content_type = props.body.content_type;
  }
  if (props.body.start_date || props.body.end_date) {
    whereConditions.created_at = {};
    if (props.body.start_date) {
      whereConditions.created_at.gte = props.body.start_date;
    }
    if (props.body.end_date) {
      whereConditions.created_at.lte = props.body.end_date;
    }
  }
  if (props.body.community_id) {
    whereConditions.community_id = props.body.community_id;
  }
  const totalReports = await MyGlobal.prisma.reddit_platform_reports.count({
    where: whereConditions,
  });
  const pendingReports = await MyGlobal.prisma.reddit_platform_reports.count({
    where: { ...whereConditions, status: "PENDING" },
  });
  const resolvedCount = await MyGlobal.prisma.reddit_platform_reports.count({
    where: { ...whereConditions, status: "RESOLVED" },
  });
  const dismissedCount = await MyGlobal.prisma.reddit_platform_reports.count({
    where: { ...whereConditions, status: "DISMISSED" },
  });
  const contentDistribution =
    await MyGlobal.prisma.reddit_platform_reports.groupBy({
      by: ["reported_content_type"],
      where: whereConditions,
      _count: { id: true },
    });
  const communityGroups = await MyGlobal.prisma.reddit_platform_reports.groupBy(
    {
      by: ["community_id"],
      where: whereConditions,
      _count: { id: true },
    },
  );
  const communityDetails = await Promise.all(
    communityGroups.map((group) =>
      MyGlobal.prisma.reddit_platform_communities.findUnique({
        where: { id: group.community_id, deleted_at: null },
        select: { id: true, name: true },
      }),
    ),
  );
  const communityBreakdown = await Promise.all(
    communityGroups.map(async (group) => {
      const community = communityDetails.find(
        (c) => c?.id === group.community_id,
      );
      const pendingCount = await MyGlobal.prisma.reddit_platform_reports.count({
        where: {
          community_id: group.community_id,
          status: "PENDING",
          deleted_at: null,
        },
      });
      return {
        communityId: group.community_id as string & tags.Format<"uuid">,
        communityName: community?.name ?? "Unknown",
        reportCount: group._count.id as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        pendingCount: pendingCount as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
      } satisfies IRedditPlatformReportAnalytic.ICommunityBreakdown;
    }),
  );
  const allCommunityGroups =
    await MyGlobal.prisma.reddit_platform_reports.groupBy({
      by: ["community_id"],
      where: whereConditions,
      _count: { id: true },
    });
  const flaggedGroupIds = allCommunityGroups
    .filter((g) => g._count.id > 100)
    .map((g) => g.community_id);
  const flaggedCommunities = await ArrayUtil.asyncMap(
    flaggedGroupIds,
    async (communityId) => {
      const community =
        await MyGlobal.prisma.reddit_platform_communities.findUnique({
          where: { id: communityId, deleted_at: null },
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            subscriber_count: true,
            created_at: true,
            owner: {
              select: {
                id: true,
                username: true,
                display_name: true,
                karma_score: true,
                is_active: true,
                created_at: true,
              },
            },
          },
        });
      if (!community) return null;
      const ownerCreatedAt = toISOStringSafe(community.owner.created_at);
      const communityCreatedAt = toISOStringSafe(community.created_at);
      const descriptionValue = community.description;
      return {
        id: community.id as string & tags.Format<"uuid">,
        name: community.name,
        description: descriptionValue,
        icon_url: community.icon_url,
        subscriber_count: community.subscriber_count,
        created_at: communityCreatedAt,
        owner: {
          id: community.owner.id as string & tags.Format<"uuid">,
          username: community.owner.username,
          display_name: community.owner.display_name,
          karma_score: community.owner.karma_score,
          is_active: community.owner.is_active,
          created_at: ownerCreatedAt,
        } satisfies IRedditPlatformMember.ISummary,
      } satisfies IRedditPlatformCommunity.ISummary;
    },
  );
  const validFlaggedCommunities: IRedditPlatformCommunity.ISummary[] = [];
  for (const c of flaggedCommunities) {
    if (c !== null) {
      validFlaggedCommunities.push(c);
    }
  }
  const resolvedReports =
    await MyGlobal.prisma.reddit_platform_reports.findMany({
      where: { ...whereConditions, status: "RESOLVED" },
      select: { created_at: true, updated_at: true },
    });
  const avgResolutionTimeMs =
    resolvedReports.length > 0
      ? Math.round(
          resolvedReports.reduce((acc, report) => {
            const createdMs = report.created_at.getTime();
            const updatedMs = report.updated_at.getTime();
            return acc + (updatedMs - createdMs);
          }, 0) / resolvedReports.length,
        )
      : 0;
  const resolutionRate =
    resolvedCount + dismissedCount > 0
      ? Math.round((resolvedCount / (resolvedCount + dismissedCount)) * 10000) /
        100
      : 0;
  const contentTypeDistribution: IRedditPlatformReportAnalytic.IContentTypeDistribution =
    contentDistribution.length > 0
      ? {
          contentType: contentDistribution[0].reported_content_type as
            | "POST"
            | "COMMENT",
          count: contentDistribution[0]._count.id as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          percentage:
            totalReports > 0
              ? Math.round(
                  (contentDistribution[0]._count.id / totalReports) * 10000,
                ) / 100
              : 0,
        }
      : {
          contentType: "POST" as "POST" | "COMMENT",
          count: 0 as number & tags.Type<"int32"> & tags.Minimum<1>,
          percentage: 0,
        };
  const totalRecords = totalReports;
  const pages = Math.ceil(totalRecords / limit) || 1;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: pages,
    } satisfies IPage.IPagination,
    data: [
      {
        total_reports: totalReports,
        pending_reports: pendingReports,
        resolution_rate: resolutionRate,
        average_resolution_time_ms: avgResolutionTimeMs,
        content_type_distribution: contentTypeDistribution,
        community_breakdown: communityBreakdown,
        flagged_communities: validFlaggedCommunities,
      },
    ],
  } satisfies IPageIRedditPlatformReportAnalytic.ISummary;
}
