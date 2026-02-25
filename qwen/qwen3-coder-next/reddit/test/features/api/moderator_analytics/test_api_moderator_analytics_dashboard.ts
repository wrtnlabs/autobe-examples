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

export async function test_api_moderator_analytics_dashboard(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection for authorization
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  // Call the analytics endpoint with moderator connection
  const analytics =
    await api.functional.redditClone.moderator.analytics.moderator.dashboard.analytics(
      moderatorConnection,
    );
  // Validate response structure and types
  typia.assert(analytics);
  // Validate required fields exist and have correct types
  TestValidator.equals(
    "daily active moderators >= 0",
    analytics.dailyActiveModerators,
    analytics.dailyActiveModerators,
  );
  TestValidator.predicate(
    "daily active moderators is valid",
    analytics.dailyActiveModerators >= 0,
  );
  TestValidator.predicate(
    "posts moderated is valid",
    analytics.postsModerated >= 0,
  );
  TestValidator.predicate(
    "comments moderated is valid",
    analytics.commentsModerated >= 0,
  );
  TestValidator.predicate("bans issued is valid", analytics.bansIssued >= 0);
  TestValidator.predicate("bans lifted is valid", analytics.bansLifted >= 0);
  TestValidator.predicate(
    "pending reports is valid",
    analytics.pendingReports >= 0,
  );
  TestValidator.predicate(
    "resolved reports is valid",
    analytics.resolvedReports >= 0,
  );
  TestValidator.predicate(
    "approval rate is valid",
    analytics.approvalRate >= 0 && analytics.approvalRate <= 100,
  );
}
