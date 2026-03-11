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
import { RedditPlatformCommunityAtSummaryTransformer } from "../transformers/RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "../transformers/RedditPlatformMemberAtSummaryTransformer";
import { RedditPlatformReportAtSummaryTransformer } from "../transformers/RedditPlatformReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberReportsQueue(props: {
  member: MemberPayload;
  body: IRedditPlatformReport.IRequest;
}): Promise<IPageIRedditPlatformReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get communities where user is moderator
  const moderatorCommunities =
    await MyGlobal.prisma.reddit_platform_community_moderators.findMany({
      where: {
        user_id: props.member.id,
      },
      select: {
        community_id: true,
      },
    });
  const communityIds = moderatorCommunities.map((m) => m.community_id);
  if (communityIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Build where filter
  const statusFilter = props.body.status ?? "PENDING";
  const communityFilter = props.body.community_id
    ? { community_id: props.body.community_id }
    : { community_id: { in: communityIds } };
  // Query reports with priority count calculation
  const reports = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where: {
      status: statusFilter,
      deleted_at: null,
      ...communityFilter,
      ...(props.body.startDate && {
        created_at: { gte: props.body.startDate },
      }),
      ...(props.body.endDate && { created_at: { lte: props.body.endDate } }),
    },
    orderBy: { created_at: "asc" },
    skip,
    take: limit,
    include: {
      reporter: RedditPlatformMemberAtSummaryTransformer.select(),
      community: RedditPlatformCommunityAtSummaryTransformer.select(),
      snapshots: true,
      resolvedBy: true,
      viewHistories: true,
    },
  });
  // Count total pending reports
  const total = await MyGlobal.prisma.reddit_platform_reports.count({
    where: {
      status: statusFilter,
      deleted_at: null,
      ...(communityFilter.community_id
        ? {}
        : { community_id: { in: communityIds } }),
      ...(props.body.startDate && {
        created_at: { gte: props.body.startDate },
      }),
      ...(props.body.endDate && { created_at: { lte: props.body.endDate } }),
    },
  });
  // Transform reports with transformer
  const transformedData = await ArrayUtil.asyncMap(reports, async (report) => {
    const transformerResult =
      await RedditPlatformReportAtSummaryTransformer.transform(report as any);
    return transformerResult satisfies IRedditPlatformReport.ISummary;
  });
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
