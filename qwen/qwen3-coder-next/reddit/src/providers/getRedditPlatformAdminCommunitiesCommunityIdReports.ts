import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformReportAtSummaryTransformer } from "../transformers/RedditPlatformReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminCommunitiesCommunityIdReports(props: {
  admin: AdminPayload;
  communityId: string;
}): Promise<IPageIRedditPlatformReport.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const posts = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: {
      community_id: props.communityId,
    },
    select: {
      id: true,
    },
  });
  const postIds = posts.map((post) => post.id);
  const comments = await MyGlobal.prisma.reddit_platform_comments.findMany({
    where: {
      post: {
        community_id: props.communityId,
      },
    },
    select: {
      id: true,
    },
  });
  const commentIds = comments.map((comment) => comment.id);
  const data = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where: {
      OR: [
        {
          reported_type: "POST",
          reported_id: { in: postIds },
        },
        {
          reported_type: "COMMENT",
          reported_id: { in: commentIds },
        },
      ],
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditPlatformReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_reports.count({
    where: {
      OR: [
        {
          reported_type: "POST",
          reported_id: { in: postIds },
        },
        {
          reported_type: "COMMENT",
          reported_id: { in: commentIds },
        },
      ],
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformReportAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
