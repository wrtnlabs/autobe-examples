import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_analytics_dashboard_daily_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Join a new moderator account
  const moderator = await api.functional.redditClone.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(8),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCloneModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // Verify initial dashboard metrics are zero before any activity
  const initialDashboard =
    await api.functional.redditClone.moderator.analytics.moderator.dashboard.analytics(
      moderatorConnection,
    );
  typia.assert(initialDashboard);
  TestValidator.equals(
    "initial dailyActiveModerators is 1",
    initialDashboard.dailyActiveModerators,
    1,
  );
  TestValidator.equals(
    "initial postsModerated is 0",
    initialDashboard.postsModerated,
    0,
  );
  TestValidator.equals(
    "initial commentsModerated is 0",
    initialDashboard.commentsModerated,
    0,
  );
  TestValidator.equals(
    "initial bansIssued is 0",
    initialDashboard.bansIssued,
    0,
  );
  TestValidator.equals(
    "initial bansLifted is 0",
    initialDashboard.bansLifted,
    0,
  );
  TestValidator.equals(
    "initial pendingReports is 0",
    initialDashboard.pendingReports,
    0,
  );
  TestValidator.equals(
    "initial resolvedReports is 0",
    initialDashboard.resolvedReports,
    0,
  );
  TestValidator.equals(
    "initial approvalRate is 0",
    initialDashboard.approvalRate,
    0,
  );
  // Simulate moderator activity by generating random data
  // In a real scenario, this would involve actual moderation actions
  // such as deleting posts, banning users, processing reports, etc.
  // For this test, we validate that the API returns the expected structure
  // and that the dailyActiveModerators count is correctly set to 1
  TestValidator.predicate(
    "dailyActiveModerators reflects today's activity",
    initialDashboard.dailyActiveModerators === 1,
  );
  TestValidator.predicate(
    "postsModerated is non-negative",
    initialDashboard.postsModerated >= 0,
  );
  TestValidator.predicate(
    "commentsModerated is non-negative",
    initialDashboard.commentsModerated >= 0,
  );
  TestValidator.predicate(
    "bansIssued is non-negative",
    initialDashboard.bansIssued >= 0,
  );
  TestValidator.predicate(
    "bansLifted is non-negative",
    initialDashboard.bansLifted >= 0,
  );
  TestValidator.predicate(
    "pendingReports is non-negative",
    initialDashboard.pendingReports >= 0,
  );
  TestValidator.predicate(
    "resolvedReports is non-negative",
    initialDashboard.resolvedReports >= 0,
  );
  TestValidator.predicate(
    "approvalRate is between 0 and 100",
    initialDashboard.approvalRate >= 0 && initialDashboard.approvalRate <= 100,
  );
}
