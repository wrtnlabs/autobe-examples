import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityDashboardSummary";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_dashboard_metrics_zero_values(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate member using utility function
  await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  // Retrieve dashboard metrics
  const dashboard =
    await api.functional.community.member.dashboard.index(memberConnection);
  typia.assert(dashboard);
  // Validate all counters are zero (edge case: no activity)
  TestValidator.equals("total_users is zero", dashboard.total_users, 0);
  TestValidator.equals("active_sessions is zero", dashboard.active_sessions, 0);
  TestValidator.equals("posts_created is zero", dashboard.posts_created, 0);
  TestValidator.equals(
    "comments_created is zero",
    dashboard.comments_created,
    0,
  );
  TestValidator.equals("votes_cast is zero", dashboard.votes_cast, 0);
  TestValidator.equals(
    "communities_created is zero",
    dashboard.communities_created,
    0,
  );
  TestValidator.equals(
    "reports_submitted is zero",
    dashboard.reports_submitted,
    0,
  );
  TestValidator.equals(
    "active_community_count is zero",
    dashboard.active_community_count,
    0,
  );
  // Validate derived averages are zero (business rule: divide by zero yields zero)
  TestValidator.equals(
    "avg_posts_per_user is zero",
    dashboard.avg_posts_per_user,
    0,
  );
  TestValidator.equals(
    "avg_comments_per_user is zero",
    dashboard.avg_comments_per_user,
    0,
  );
  TestValidator.equals(
    "avg_votes_per_post is zero",
    dashboard.avg_votes_per_post,
    0,
  );
  TestValidator.equals(
    "avg_votes_per_comment is zero",
    dashboard.avg_votes_per_comment,
    0,
  );
  TestValidator.equals(
    "avg_session_duration is zero",
    dashboard.avg_session_duration,
    0,
  );
}
