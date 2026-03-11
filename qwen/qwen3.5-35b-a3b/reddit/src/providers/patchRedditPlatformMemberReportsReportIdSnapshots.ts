import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportSnapshot";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformReportSnapshotAtSummaryTransformer } from "../transformers/RedditPlatformReportSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberReportsReportIdSnapshots(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditPlatformReportSnapshot.IRequest;
}): Promise<IPageIRedditPlatformReportSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Verify report exists and get community_id
  const report = await MyGlobal.prisma.reddit_platform_reports.findUnique({
    where: { id: props.reportId },
    select: { id: true, community_id: true },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  // Verify member is moderator of the community
  const moderation =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: report.community_id,
        user_id: props.member.id,
      },
    });
  if (!moderation) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause with optional status filter
  const whereInput: Prisma.reddit_platform_report_snapshotsWhereInput = {
    reddit_platform_report_id: props.reportId,
    ...(props.body.status !== undefined && { status: props.body.status }),
  };
  // Build orderBy based on sort_by and sort_order
  const orderByInput = (
    props.body.sort_by === "status"
      ? [{ status: props.body.sort_order ?? ("asc" as const) }]
      : props.body.sort_by === "resolved_at"
        ? [{ resolved_at: (props.body.sort_order ?? "desc") as "asc" | "desc" }]
        : [
            {
              snapshot_created_at: (props.body.sort_order ?? "desc") as
                | "asc"
                | "desc",
            },
          ]
  ) satisfies Prisma.reddit_platform_report_snapshotsOrderByWithRelationInput[];
  // Query snapshots
  const data = await MyGlobal.prisma.reddit_platform_report_snapshots.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditPlatformReportSnapshotAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_platform_report_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditPlatformReportSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditPlatformReportSnapshot.ISummary;
}
