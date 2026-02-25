import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReportResolution";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_resolution_analytics(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Register a new moderator account
  const moderator = await api.functional.redditClone.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(8),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCloneModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // Update connection with moderator's token
  moderatorConnection.headers = {
    ...moderatorConnection.headers,
    Authorization: moderator.token.access,
  };
  // Call resolution analytics endpoint
  const analytics =
    await api.functional.redditClone.moderator.analytics.reports.resolution.resolutionAnalytics(
      moderatorConnection,
    );
  // Validate response structure
  typia.assert(analytics);
  // Verify required properties exist
  TestValidator.predicate("has id", analytics.id !== undefined);
  TestValidator.predicate("has reportId", analytics.reportId !== undefined);
  TestValidator.predicate(
    "has moderatorId",
    analytics.moderatorId !== undefined,
  );
  TestValidator.predicate("has action", analytics.action !== undefined);
  TestValidator.predicate("has resolvedAt", analytics.resolvedAt !== undefined);
}
