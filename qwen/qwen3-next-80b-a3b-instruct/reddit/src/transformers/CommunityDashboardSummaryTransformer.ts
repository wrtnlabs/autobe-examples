import { ICommunityDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityDashboardSummary";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityDashboardSummaryTransformer {
  export type Payload = Prisma.community_usage_metricsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
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
    } satisfies Prisma.community_usage_metricsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityDashboardSummary> {
    return {
      total_users: input.total_users,
      active_sessions: input.active_sessions,
      posts_created: input.posts_created,
      comments_created: input.comments_created,
      votes_cast: input.votes_cast,
      communities_created: input.communities_created,
      reports_submitted: input.reports_submitted,
      avg_posts_per_user: input.avg_posts_per_user,
      avg_comments_per_user: input.avg_comments_per_user,
      avg_votes_per_post: input.avg_votes_per_post,
      avg_votes_per_comment: input.avg_votes_per_comment,
      avg_session_duration: input.avg_session_duration,
      active_community_count: input.active_community_count,
    };
  }
}
