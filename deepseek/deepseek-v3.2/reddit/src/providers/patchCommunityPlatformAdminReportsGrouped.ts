import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReportApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportApproval";
import { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import { ICommunityPlatformReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComment";
import { ICommunityPlatformReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformContentReportAtGroupedSummaryItemTransformer } from "../transformers/CommunityPlatformContentReportAtGroupedSummaryItemTransformer";
import { CommunityPlatformContentReportAtSummaryTransformer } from "../transformers/CommunityPlatformContentReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminReportsGrouped(props: {
  admin: AdminPayload;
  body: ICommunityPlatformContentReport.IGroupedRequest;
}): Promise<IPageICommunityPlatformContentReport.IGroupedSummary> {
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build filter conditions from request body
  const whereInput: Prisma.community_platform_content_reportsWhereInput = {
    deleted_at: null,
    ...(props.body.community_id && { community_id: props.body.community_id }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.created_after && {
      created_at: { gte: new Date(props.body.created_after) },
    }),
    ...(props.body.created_before && {
      created_at: { lte: new Date(props.body.created_before) },
    }),
    ...(props.body.updated_after && {
      updated_at: { gte: new Date(props.body.updated_after) },
    }),
    ...(props.body.updated_before && {
      updated_at: { lte: new Date(props.body.updated_before) },
    }),
  };
  // First, query for raw reports with subtype relations to determine content type/ID
  const rawReports =
    await MyGlobal.prisma.community_platform_content_reports.findMany({
      where: whereInput,
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reporter_member_id: true,
        community_id: true,
        postReport: {
          select: {
            community_platform_post_id: true,
          },
        } satisfies Prisma.community_platform_report_of_postsFindManyArgs,
        commentReport: {
          select: {
            community_platform_comment_id: true,
          },
        } satisfies Prisma.community_platform_report_of_commentsFindManyArgs,
      },
      orderBy: { created_at: "desc" },
    });
  // Group raw reports by content type and content ID
  const groupedMap = new Map<string, (typeof rawReports)[0][]>();
  for (const report of rawReports) {
    const contentType = report.postReport ? "post" : "comment";
    const contentId = report.postReport
      ? report.postReport.community_platform_post_id
      : report.commentReport?.community_platform_comment_id;
    if (!contentId) continue;
    const key = `${contentType}:${contentId}`;
    if (!groupedMap.has(key)) {
      groupedMap.set(key, []);
    }
    groupedMap.get(key)!.push(report);
  }
  // Convert grouped map to array and apply pagination
  const groupedEntries = Array.from(groupedMap.entries());
  const paginatedEntries = groupedEntries.slice(skip, skip + limit);
  // Transform paginated groups into final data structure
  const data: ICommunityPlatformContentReport.IGroupedSummary[] = [];
  for (const [key, groupReports] of paginatedEntries) {
    const [contentType, contentId] = key.split(":");
    if (groupReports.length === 0) continue;
    // Get community details from first report in group
    const firstReportId = groupReports[0].id;
    const firstReportWithDetails =
      await MyGlobal.prisma.community_platform_content_reports.findUniqueOrThrow(
        {
          where: { id: firstReportId },
          ...CommunityPlatformContentReportAtSummaryTransformer.select(),
        },
      );
    const community =
      await CommunityPlatformContentReportAtSummaryTransformer.transform(
        firstReportWithDetails,
      ).then((r) => r.community);
    // Get individual report details for this group
    const individualReportsPromises = groupReports.map(async (report) => {
      const reportWithDetails =
        await MyGlobal.prisma.community_platform_content_reports.findUniqueOrThrow(
          {
            where: { id: report.id },
            ...CommunityPlatformContentReportAtGroupedSummaryItemTransformer.select(),
          },
        );
      return await CommunityPlatformContentReportAtGroupedSummaryItemTransformer.transform(
        reportWithDetails,
      );
    });
    const individualReports = await Promise.all(individualReportsPromises);
    // Calculate timestamps
    const reportDates = groupReports.map((r) => r.created_at);
    const latestReportAt = new Date(
      Math.max(...reportDates.map((d) => d.getTime())),
    ).toISOString();
    const firstReportAt = new Date(
      Math.min(...reportDates.map((d) => d.getTime())),
    ).toISOString();
    // Construct grouped summary
    data.push({
      id: v4(),
      content_type: contentType as "post" | "comment",
      content_id: contentId as string & tags.Format<"uuid">,
      total_reports: groupReports.length satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> as number & tags.Type<"int32"> & tags.Minimum<1>,
      latest_report_at: latestReportAt as string & tags.Format<"date-time">,
      first_report_at: firstReportAt as string & tags.Format<"date-time">,
      community,
      individual_reports: individualReports,
    } satisfies ICommunityPlatformContentReport.IGroupedSummary);
  }
  // Get total count for pagination
  const total = groupedEntries.length;
  // Return paginated result
  return {
    pagination: {
      current: page satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0> as number & tags.Type<"int32"> & tags.Minimum<0>,
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
    data,
  } satisfies IPageICommunityPlatformContentReport.IGroupedSummary;
}
