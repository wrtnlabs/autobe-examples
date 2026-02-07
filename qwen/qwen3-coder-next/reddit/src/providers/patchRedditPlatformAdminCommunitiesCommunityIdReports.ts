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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminCommunitiesCommunityIdReports(props: {
  admin: AdminPayload;
  communityId: string;
  body: IRedditPlatformReport.IRequest;
}): Promise<IPageIRedditPlatformReport.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  // Filter reports for posts in the specified community
  // Need to join reddit_platform_reports with reddit_platform_posts via target_id when target_type is 'post'
  const data = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where: {
      target_type: "post",
      reddit_platform_posts: {
        community_id: props.communityId,
      },
    },
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      target_type: true,
      target_id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_platform_reports.count({
    where: {
      target_type: "post",
      reddit_platform_posts: {
        community_id: props.communityId,
      },
    },
  });
  return {
    data: data.map((report) => ({
      id: report.id as string & tags.Format<"uuid">,
      target_type: report.target_type,
      target_id: report.target_id as string & tags.Format<"uuid">,
      reason: report.reason,
      status: report.status,
      created_at: toISOStringSafe(report.created_at),
      updated_at: toISOStringSafe(report.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
