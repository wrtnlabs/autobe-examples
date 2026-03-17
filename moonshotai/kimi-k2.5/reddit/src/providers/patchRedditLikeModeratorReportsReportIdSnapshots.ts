import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReportSnapshot";
import { IRedditLikeReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeReportSnapshotAtSummaryTransformer } from "../transformers/RedditLikeReportSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeModeratorReportsReportIdSnapshots(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditLikeReportSnapshot.IRequest;
}): Promise<IPageIRedditLikeReportSnapshot.ISummary> {
  // Verify report exists and get community info
  const report = await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: { id: true, community_id: true },
  });
  // Verify moderator has privileges for this community
  const moderatorRecord =
    await MyGlobal.prisma.reddit_like_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: report.community_id,
        deleted_at: null,
      },
    });
  if (moderatorRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortDirection = props.body.sortDirection ?? "desc";
  // Query snapshots with pagination
  const snapshots = await MyGlobal.prisma.reddit_like_report_snapshots.findMany(
    {
      where: { reddit_like_report_id: props.reportId },
      skip,
      take: limit,
      orderBy: { created_at: sortDirection },
      ...RedditLikeReportSnapshotAtSummaryTransformer.select(),
    },
  );
  // Get total count
  const total = await MyGlobal.prisma.reddit_like_report_snapshots.count({
    where: { reddit_like_report_id: props.reportId },
  });
  // Transform to DTOs
  const data = await ArrayUtil.asyncMap(
    snapshots,
    RedditLikeReportSnapshotAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
