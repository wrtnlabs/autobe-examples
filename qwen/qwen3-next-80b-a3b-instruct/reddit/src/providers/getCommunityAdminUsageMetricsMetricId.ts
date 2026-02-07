import { ICommunityUsageMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUsageMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityAdminUsageMetricsMetricId(props: {
  admin: AdminPayload;
  metricId: string & tags.Format<"uuid">;
}): Promise<ICommunityUsageMetric> {
  const metric = await MyGlobal.prisma.community_usage_metrics.findUnique({
    where: { id: props.metricId },
  });
  if (!metric) {
    throw new HttpException("Usage metric not found", 404);
  }
  return {
    id: metric.id,
    timestamp: toISOStringSafe(metric.timestamp),
    total_users: metric.total_users,
    active_sessions: metric.active_sessions,
    posts_created: metric.posts_created,
    comments_created: metric.comments_created,
    votes_cast: metric.votes_cast,
    communities_created: metric.communities_created,
    reports_submitted: metric.reports_submitted,
    avg_posts_per_user: metric.avg_posts_per_user,
    avg_comments_per_user: metric.avg_comments_per_user,
    avg_votes_per_post: metric.avg_votes_per_post,
    avg_votes_per_comment: metric.avg_votes_per_comment,
    avg_session_duration: metric.avg_session_duration,
    active_community_count: metric.active_community_count,
  };
}
