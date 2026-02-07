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

export async function test_api_dashboard_metrics_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate member by joining
  await authorize_member_join(memberConnection, {
    body: {
      // ICommunityMember.IJoin is empty, so we pass an empty object
    } satisfies ICommunityMember.IJoin,
  });
  // Access the dashboard metrics endpoint
  const dashboardMetrics =
    await api.functional.community.member.dashboard.index(memberConnection);
  typia.assert(dashboardMetrics);
  // Business logic validation: Ensure non-negative values for all metrics
  TestValidator.predicate(
    "total_users non-negative",
    dashboardMetrics.total_users >= 0,
  );
  TestValidator.predicate(
    "active_sessions non-negative",
    dashboardMetrics.active_sessions >= 0,
  );
  TestValidator.predicate(
    "posts_created non-negative",
    dashboardMetrics.posts_created >= 0,
  );
  TestValidator.predicate(
    "comments_created non-negative",
    dashboardMetrics.comments_created >= 0,
  );
  TestValidator.predicate(
    "votes_cast non-negative",
    dashboardMetrics.votes_cast >= 0,
  );
  TestValidator.predicate(
    "communities_created non-negative",
    dashboardMetrics.communities_created >= 0,
  );
  TestValidator.predicate(
    "reports_submitted non-negative",
    dashboardMetrics.reports_submitted >= 0,
  );
  TestValidator.predicate(
    "avg_posts_per_user non-negative",
    dashboardMetrics.avg_posts_per_user >= 0,
  );
  TestValidator.predicate(
    "avg_comments_per_user non-negative",
    dashboardMetrics.avg_comments_per_user >= 0,
  );
  TestValidator.predicate(
    "avg_votes_per_post non-negative",
    dashboardMetrics.avg_votes_per_post >= 0,
  );
  TestValidator.predicate(
    "avg_votes_per_comment non-negative",
    dashboardMetrics.avg_votes_per_comment >= 0,
  );
  TestValidator.predicate(
    "avg_session_duration non-negative",
    dashboardMetrics.avg_session_duration >= 0,
  );
  TestValidator.predicate(
    "active_community_count non-negative",
    dashboardMetrics.active_community_count >= 0,
  );
}
