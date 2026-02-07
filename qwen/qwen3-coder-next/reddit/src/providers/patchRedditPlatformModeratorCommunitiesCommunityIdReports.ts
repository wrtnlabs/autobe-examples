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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformModeratorCommunitiesCommunityIdReports(props: {
  moderator: ModeratorPayload;
  communityId: string;
  body: IRedditPlatformReport.IRequest;
}): Promise<IPageIRedditPlatformReport.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Get posts in the community
  const posts = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: {
      community_id: props.communityId,
    },
    select: {
      id: true,
    },
  });
  const postIds = posts.map((p) => p.id);
  // Get reports for posts in the community
  const reports = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where: {
      target_type: "post",
      target_id: { in: postIds },
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.reddit_platform_reports.count({
    where: {
      target_type: "post",
      target_id: { in: postIds },
    },
  });
  const summaryData: IRedditPlatformReport.ISummary[] = reports.map(
    (report) => ({
      id: report.id,
      target_type: report.target_type,
      target_id: report.target_id,
      reason: report.reason,
      status: report.status,
      created_at: toISOStringSafe(report.created_at) as string &
        tags.Format<"date-time">,
    }),
  );
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
