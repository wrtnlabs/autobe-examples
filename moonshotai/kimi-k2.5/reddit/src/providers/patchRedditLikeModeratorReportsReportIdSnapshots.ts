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
  // Verify moderator has access to this report's community
  const report = await MyGlobal.prisma.reddit_like_reports.findFirst({
    where: { id: props.reportId },
    select: {
      id: true,
      community_id: true,
    },
  });
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
  const isModerator = await MyGlobal.prisma.reddit_like_moderators.findFirst({
    where: {
      member_id: props.moderator.id,
      community_id: report.community_id,
      deleted_at: null,
    },
  });
  if (isModerator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Parse pagination parameters
  const page = (props.body.page ?? 1) satisfies number as number;
  const limit = (props.body.limit ?? 20) satisfies number as number;
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
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      snapshots,
      RedditLikeReportSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
