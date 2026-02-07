import { ICommunityUsageMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUsageMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityUsageMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityUsageMetric";
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

export async function patchCommunityAdminAnalyticsUsage(props: {
  admin: AdminPayload;
}): Promise<IPageICommunityUsageMetric.ISummary> {
  const { admin } = props;
  // Extract pagination parameters from request body or query (in NestJS query params are accessed through request, but API contract specified no requestBody)
  // Since API contract defined no request body, we assume page and limit are query parameters
  // However, TypeScript interface shows null body, so we need to treat as likely default values
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.community_usage_metrics.findMany({
    orderBy: { timestamp: "desc" },
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.community_usage_metrics.count();
  return {
    data: data.map((record) => ({
      timestamp: toISOStringSafe(record.timestamp) as string &
        tags.Format<"date-time">,
      total_users: record.total_users,
      active_sessions: record.active_sessions,
      posts_created: record.posts_created,
      comments_created: record.comments_created,
      votes_cast: record.votes_cast,
      communities_created: record.communities_created,
      reports_submitted: record.reports_submitted,
      avg_posts_per_user: record.avg_posts_per_user,
      avg_comments_per_user: record.avg_comments_per_user,
      avg_votes_per_post: record.avg_votes_per_post,
      avg_votes_per_comment: record.avg_votes_per_comment,
      avg_session_duration: record.avg_session_duration,
      active_community_count: record.active_community_count,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
