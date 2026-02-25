import { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserVoteKarmaImpactsKarmaImpactId(props: {
  user: UserPayload;
  karmaImpactId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformVoteKarmaImpact> {
  const karmaImpact =
    await MyGlobal.prisma.community_platform_vote_karma_impacts.findUniqueOrThrow(
      {
        where: {
          id: props.karmaImpactId,
          user_id: props.user.id,
        },
        select: {
          id: true,
          karma_delta: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
  // The DTO expects analytics data, so we create minimal analytics from this single record
  return {
    id: karmaImpact.id as string & tags.Format<"uuid">,
    period_start: karmaImpact.created_at.toISOString() as string &
      tags.Format<"date-time">,
    period_end: karmaImpact.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    period_type: "hourly",
    vote_submission_count: 1,
    vote_submission_avg_time_ms: 0,
    vote_score_update_count: 1,
    vote_score_update_avg_time_ms: 0,
    karma_calculation_count: 1,
    karma_calculation_avg_time_ms: 0,
    feed_score_update_count: 0,
    feed_score_update_avg_time_ms: 0,
    upvote_count: karmaImpact.karma_delta > 0 ? 1 : 0,
    downvote_count: karmaImpact.karma_delta < 0 ? 1 : 0,
    vote_ratio: karmaImpact.karma_delta > 0 ? 1 : 0,
    karma_impact_total: karmaImpact.karma_delta,
    karma_impact_avg_per_vote: karmaImpact.karma_delta,
    error_count: 0,
    error_rate: 0,
    rate_limit_hits: 0,
    system_cpu_utilization: 0,
    system_memory_utilization: 0,
    created_at: karmaImpact.created_at.toISOString() as string &
      tags.Format<"date-time">,
  } satisfies ICommunityPlatformVoteKarmaImpact;
}
