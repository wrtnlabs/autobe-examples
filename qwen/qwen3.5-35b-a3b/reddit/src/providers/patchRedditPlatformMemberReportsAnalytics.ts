import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberReportsAnalytics(props: {
  member: MemberPayload;
  body: IRedditPlatformReport.IRequest;
}): Promise<IPageIRedditPlatformReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 1000);
  const skip = (page - 1) * limit;
  // Validate date range
  if (
    props.body.startDate !== undefined &&
    props.body.endDate !== undefined &&
    props.body.startDate > props.body.endDate
  ) {
    throw new HttpException("Invalid date range", 400);
  }
  // Build WHERE filters
  const whereFilters: Prisma.reddit_platform_reportsWhereInput = {
    deleted_at: null,
  };
  if (props.body.startDate !== undefined) {
    const startDate = new Date(props.body.startDate);
    whereFilters.created_at = {
      gte: startDate,
    };
  }
  if (props.body.endDate !== undefined) {
    const endDate = new Date(props.body.endDate);
    if (
      whereFilters.created_at &&
      typeof whereFilters.created_at === "object" &&
      "gte" in whereFilters.created_at
    ) {
      whereFilters.created_at = {
        ...whereFilters.created_at,
        lte: endDate,
      };
    } else {
      whereFilters.created_at = {
        lte: endDate,
      };
    }
  }
  if (props.body.status !== undefined) {
    whereFilters.status = props.body.status;
  }
  // Validate community access
  if (props.body.community_id !== undefined) {
    const communityModerators =
      await MyGlobal.prisma.reddit_platform_community_moderators.findMany({
        where: {
          community_id: props.body.community_id,
          user_id: props.member.id,
        },
        select: { community_id: true },
      });
    const communityOwner =
      await MyGlobal.prisma.reddit_platform_communities.findUnique({
        where: { id: props.body.community_id },
        select: { owner_id: true },
      });
    const hasAccess =
      communityModerators.length > 0 ||
      (communityOwner !== null && communityOwner.owner_id === props.member.id);
    if (!hasAccess) {
      throw new HttpException("Forbidden", 403);
    }
    whereFilters.community_id = props.body.community_id;
  } else {
    // Get all communities the member has access to
    const memberModeratedCommunities =
      await MyGlobal.prisma.reddit_platform_community_moderators.findMany({
        where: {
          user_id: props.member.id,
        },
        select: { community_id: true },
      });
    const memberOwnedCommunities =
      await MyGlobal.prisma.reddit_platform_communities.findMany({
        where: {
          owner_id: props.member.id,
        },
        select: { id: true },
      });
    const communityIds = [
      ...memberModeratedCommunities.map((m) => m.community_id),
      ...memberOwnedCommunities.map((c) => c.id),
    ];
    if (communityIds.length > 0) {
      whereFilters.community_id = { in: communityIds };
    } else {
      return {
        pagination: {
          current: page,
          limit: limit,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        data: [],
      } satisfies IPageIRedditPlatformReport.ISummary;
    }
  }
  // Query total count for pagination
  const total = await MyGlobal.prisma.reddit_platform_reports.count({
    where: whereFilters,
  });
  if (total === 0) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    } satisfies IPageIRedditPlatformReport.ISummary;
  }
  // Query reports with community and reporter data
  const reports = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where: whereFilters,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      reporter_id: true,
      community_id: true,
      reported_content_type: true,
      reported_content_id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
      community: {
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
      },
      reporter: {
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
  const data = await ArrayUtil.asyncMap(reports, async (report) => {
    const reporter: IRedditPlatformMember.ISummary = {
      id: report.reporter.id,
      username: report.reporter.username,
      display_name: report.reporter.display_name,
      karma_score: report.reporter.karma_score,
      is_active: report.reporter.is_active,
      created_at: toISOStringSafe(report.reporter.created_at),
    } satisfies IRedditPlatformMember.ISummary;
    const community: IRedditPlatformCommunity.ISummary = {
      id: report.community.id,
      name: report.community.name,
      description: report.community.description ?? undefined,
      icon_url: report.community.icon_url ?? undefined,
      subscriber_count: report.community.subscriber_count,
      created_at: toISOStringSafe(report.community.created_at),
      owner: {
        id: report.community.owner.id,
        username: report.community.owner.username,
        display_name: report.community.owner.display_name,
        karma_score: report.community.owner.karma_score,
        is_active: report.community.owner.is_active,
        created_at: toISOStringSafe(report.community.owner.created_at),
      } satisfies IRedditPlatformMember.ISummary,
    } satisfies IRedditPlatformCommunity.ISummary;
    return {
      id: report.id,
      reported_content_type: report.reported_content_type as "POST" | "COMMENT",
      reported_content_id: report.reported_content_id,
      reason: report.reason,
      status: report.status as "PENDING" | "RESOLVED" | "DISMISSED",
      reporter: reporter,
      community: community,
      created_at: toISOStringSafe(report.created_at),
      updated_at: toISOStringSafe(report.updated_at),
    } satisfies IRedditPlatformReport.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIRedditPlatformReport.ISummary;
}
