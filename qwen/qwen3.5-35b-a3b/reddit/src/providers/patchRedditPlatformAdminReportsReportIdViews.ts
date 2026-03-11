import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReportView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportView";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { IRedditPlatformReportView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportView";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformReportViewAtSummaryTransformer } from "../transformers/RedditPlatformReportViewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminReportsReportIdViews(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditPlatformReportView.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const report =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: { id: true, community_id: true },
    });
  const communityModeration =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: report.community_id,
        user_id: props.admin.id,
      },
      select: { id: true },
    });
  if (!communityModeration) {
    throw new HttpException("Forbidden", 403);
  }
  const data = await MyGlobal.prisma.reddit_platform_report_views.findMany({
    where: {
      report_id: props.reportId,
    },
    orderBy: { viewed_at: "desc" },
    skip,
    take: limit,
    ...RedditPlatformReportViewAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_report_views.count({
    where: {
      report_id: props.reportId,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformReportViewAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditPlatformReportView.ISummary;
}
