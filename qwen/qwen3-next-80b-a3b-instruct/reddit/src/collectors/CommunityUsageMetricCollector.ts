import { ICommunityUsageMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUsageMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityUsageMetricCollector {
  export async function collect(props: {
    body: ICommunityUsageMetric.ICreate;
  }) {
    return {
      id: v4(),
      timestamp: new Date(),
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
    } satisfies Prisma.community_usage_metricsCreateInput;
  }
}
