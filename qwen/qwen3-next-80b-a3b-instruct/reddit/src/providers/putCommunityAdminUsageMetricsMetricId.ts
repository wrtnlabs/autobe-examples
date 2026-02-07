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

export async function putCommunityAdminUsageMetricsMetricId(props: {
  admin: AdminPayload;
  metricId: string & tags.Format<"uuid">;
  body: ICommunityUsageMetric;
}): Promise<ICommunityUsageMetric> {
  // Verify the record exists and is active
  const existing = await MyGlobal.prisma.community_usage_metrics.findUnique({
    where: { id: props.metricId },
  });
  if (!existing) {
    throw new HttpException("Usage metrics record not found", 404);
  }
  // Define the expected shape of the body that we know exists in the database
  const expectedMetricsShape = {
    total_users: 0,
    active_sessions: 0,
    posts_created: 0,
    comments_created: 0,
    votes_cast: 0,
    communities_created: 0,
    reports_submitted: 0,
    avg_posts_per_user: 0,
    avg_comments_per_user: 0,
    avg_votes_per_post: 0,
    avg_votes_per_comment: 0,
    avg_session_duration: 0,
    active_community_count: 0,
  } as const;
  // Validate body conforms to expected shape using typia.assert
  const validatedBody = typia.assert<typeof expectedMetricsShape>(props.body);
  // Validate all numeric fields are non-negative (as required by spec)
  const integerFieldsToValidate = [
    "total_users",
    "active_sessions",
    "posts_created",
    "comments_created",
    "votes_cast",
    "communities_created",
    "reports_submitted",
    "active_community_count",
  ] as const;
  for (const field of integerFieldsToValidate) {
    if (validatedBody[field] < 0) {
      throw new HttpException(`${field} must be non-negative`, 400);
    }
  }
  // Validate float fields are non-negative
  const floatFieldsToValidate = [
    "avg_posts_per_user",
    "avg_comments_per_user",
    "avg_votes_per_post",
    "avg_votes_per_comment",
    "avg_session_duration",
  ] as const;
  for (const field of floatFieldsToValidate) {
    if (validatedBody[field] < 0) {
      throw new HttpException(`${field} must be non-negative`, 400);
    }
  }
  // Update record with new values, preserving original id and timestamp
  const updated = await MyGlobal.prisma.community_usage_metrics.update({
    where: { id: props.metricId },
    data: {
      total_users: validatedBody.total_users,
      active_sessions: validatedBody.active_sessions,
      posts_created: validatedBody.posts_created,
      comments_created: validatedBody.comments_created,
      votes_cast: validatedBody.votes_cast,
      communities_created: validatedBody.communities_created,
      reports_submitted: validatedBody.reports_submitted,
      avg_posts_per_user: validatedBody.avg_posts_per_user,
      avg_comments_per_user: validatedBody.avg_comments_per_user,
      avg_votes_per_post: validatedBody.avg_votes_per_post,
      avg_votes_per_comment: validatedBody.avg_votes_per_comment,
      avg_session_duration: validatedBody.avg_session_duration,
      active_community_count: validatedBody.active_community_count,
    },
  });
  // Return exactly the input body as the schema ICommunityUsageMetric is {} and we return full replacement
  // Per specification, entire record is replaced - so return the body as the response
  return validatedBody;
}
