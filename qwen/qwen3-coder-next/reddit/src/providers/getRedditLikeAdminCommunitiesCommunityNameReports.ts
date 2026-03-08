import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeReportAtSummaryTransformer } from "../transformers/RedditLikeReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeAdminCommunitiesCommunityNameReports(props: {
  admin: AdminPayload;
  communityName: string;
}): Promise<IPageIRedditLikeReport.ISummary> {
  const community =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: { name: props.communityName },
      select: { id: true },
    });
  const whereInput: Prisma.reddit_like_reportsWhereInput = {
    deleted_at: null,
    reportedPost: { community_id: community.id },
  };
  const data = await MyGlobal.prisma.reddit_like_reports.findMany({
    where: whereInput,
    ...RedditLikeReportAtSummaryTransformer.select(),
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.reddit_like_reports.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditLikeReportAtSummaryTransformer.transform,
    ),
    pagination: {
      current: 1,
      limit: 50,
      records: total,
      pages: Math.ceil(total / 50),
    } satisfies IPage.IPagination,
  };
}
