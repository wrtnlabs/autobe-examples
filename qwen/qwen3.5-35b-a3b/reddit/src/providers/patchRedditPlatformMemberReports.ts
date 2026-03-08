import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
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

export async function patchRedditPlatformMemberReports(props: {
  member: MemberPayload;
  body: IRedditPlatformReport.IRequest;
}): Promise<IPageIRedditPlatformReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  // Calculate skip for pagination
  const skip = props.body.cursor
    ? Math.floor(Number(props.body.cursor) / (limit * 1000) - page * limit)
    : (page - 1) * limit;
  // Step 1: Get communities where member is moderator
  const moderatorCommunities =
    await MyGlobal.prisma.reddit_platform_community_moderators.findMany({
      where: {
        user_id: props.member.id,
      },
      select: { community_id: true },
    });
  if (moderatorCommunities.length === 0) {
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
  const communityIds = moderatorCommunities.map((mc) => mc.community_id);
  // Step 2: Build WHERE clause
  const whereInput: Prisma.reddit_platform_reportsWhereInput = {
    community_id: { in: communityIds },
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.content_type !== undefined && {
      reported_content_type: props.body.content_type,
    }),
    ...(props.body.reporter_id !== undefined && {
      reporter_id: props.body.reporter_id,
    }),
    ...(props.body.created_after !== undefined && {
      created_at: { gte: props.body.created_after },
    }),
    ...(props.body.created_before !== undefined && {
      created_at: { lt: props.body.created_before },
    }),
    ...(props.body.reason_search !== undefined && {
      reason: {
        contains: props.body.reason_search,
        mode: "insensitive",
      },
    }),
  };
  // Handle cursor for next page
  if (props.body.cursor && skip <= 0) {
    whereInput.created_at = { lt: props.body.cursor };
  }
  // Step 3: Determine sort order
  const orderByInput: Prisma.reddit_platform_reportsOrderByWithRelationInput[] =
    props.body.sort_type === "PRIORITY"
      ? [{ created_at: "desc" as const }]
      : [{ created_at: "desc" as const }];
  // Step 4: Count total records for pagination
  const total = await MyGlobal.prisma.reddit_platform_reports.count({
    where: whereInput,
  });
  // Step 5: Query reports with joins
  const data = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where: whereInput,
    skip: Math.max(0, skip),
    take: limit,
    orderBy: orderByInput,
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
      resolved_by_id: true,
    },
  });
  // Step 6: Get reporter usernames
  const reporterIds = data
    .map((r) => r.reporter_id)
    .filter((id): id is string => id !== undefined);
  const reporterMap =
    reporterIds.length > 0
      ? await MyGlobal.prisma.reddit_platform_members
          .findMany({
            where: { id: { in: reporterIds } },
            select: { id: true, username: true },
          })
          .then((reporters) =>
            Object.fromEntries(
              reporters.map((r) => [r.id, r.username] as const),
            ),
          )
      : {};
  // Step 7: Get community names
  const communityIdsFromData = data.map((r) => r.community_id);
  const communityMap =
    communityIdsFromData.length > 0
      ? await MyGlobal.prisma.reddit_platform_communities
          .findMany({
            where: { id: { in: communityIdsFromData } },
            select: { id: true, name: true },
          })
          .then((communities) =>
            Object.fromEntries(communities.map((c) => [c.id, c.name] as const)),
          )
      : {};
  // Step 8: Transform to ISummary
  const summaryData: IRedditPlatformReport.ISummary[] = data.map((report) => ({
    id: report.id,
    reporter_username: reporterMap[report.reporter_id] ?? "",
    community_name: communityMap[report.community_id] ?? "",
    reported_content_type: report.reported_content_type,
    reported_content_id: report.reported_content_id,
    reason: report.reason,
    status: report.status,
    created_at: toISOStringSafe(report.created_at),
    resolved_at:
      report.resolved_by_id !== null
        ? toISOStringSafe(report.updated_at)
        : null,
  }));
  // Calculate next cursor
  const nextCursor =
    data.length > 0 && data[data.length - 1].created_at
      ? toISOStringSafe(data[data.length - 1].created_at)
      : undefined;
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
