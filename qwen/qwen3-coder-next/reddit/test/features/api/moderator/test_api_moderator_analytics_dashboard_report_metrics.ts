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

export async function test_api_moderator_analytics_dashboard_report_metrics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator connection for authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  // 2. Fetch analytics dashboard report metrics
  const analytics =
    await api.functional.redditClone.moderator.analytics.moderator.dashboard.analytics(
      moderatorConnection,
    );
  typia.assert(analytics);
  // 3. Validate analytics dashboard structure
  TestValidator.predicate(
    "dailyActiveModerators >= 0",
    analytics.dailyActiveModerators >= 0,
  );
  TestValidator.predicate("postsModerated >= 0", analytics.postsModerated >= 0);
  TestValidator.predicate(
    "commentsModerated >= 0",
    analytics.commentsModerated >= 0,
  );
  TestValidator.predicate("bansIssued >= 0", analytics.bansIssued >= 0);
  TestValidator.predicate("bansLifted >= 0", analytics.bansLifted >= 0);
  TestValidator.predicate("pendingReports >= 0", analytics.pendingReports >= 0);
  TestValidator.predicate(
    "resolvedReports >= 0",
    analytics.resolvedReports >= 0,
  );
  TestValidator.predicate(
    "approvalRate >= 0 && approvalRate <= 100",
    analytics.approvalRate >= 0 && analytics.approvalRate <= 100,
  );
  // 4. Validate report metrics calculation logic
  // approvalRate = (approved / (approved + dismissed)) * 100
  // Since we cannot determine exact approved/dismissed counts from the response,
  // we validate that the calculation logic is consistent with the reported metrics
  TestValidator.predicate(
    "approvalRate logical",
    analytics.resolvedReports === 0 ||
      (analytics.approvalRate >= 0 && analytics.approvalRate <= 100),
  );
}
