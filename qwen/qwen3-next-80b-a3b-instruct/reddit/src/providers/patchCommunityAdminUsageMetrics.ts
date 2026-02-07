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

export async function patchCommunityAdminUsageMetrics(props: {
  admin: AdminPayload;
  body: ICommunityUsageMetric.IRequest;
}): Promise<IPageICommunityUsageMetric.ISummary> {
  const page = 1;
  const limit = 50;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.community_usage_metrics.findMany({
    orderBy: { timestamp: "asc" },
    skip,
    take: limit,
    select: {
      timestamp: true,
      total_users: true,
      active_sessions: true,
      posts_created: true,
      comments_created: true,
      votes_cast: true,
      communities_created: true,
      reports_submitted: true,
      avg_posts_per_user: true,
      avg_comments_per_user: true,
      avg_votes_per_post: true,
      avg_votes_per_comment: true,
      avg_session_duration: true,
      active_community_count: true,
    },
  });
  const total = await MyGlobal.prisma.community_usage_metrics.count();
  const transformedData = data.map((record) => ({
    timestamp: toISOStringSafe(record.timestamp),
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
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
