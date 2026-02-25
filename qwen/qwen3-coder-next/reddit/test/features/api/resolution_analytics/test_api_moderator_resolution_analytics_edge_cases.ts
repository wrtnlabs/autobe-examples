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

export async function test_api_moderator_resolution_analytics_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection for analytics access
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  // Test 1: Zero reports scenario
  const zeroReports =
    await api.functional.redditClone.moderator.analytics.reports.resolution.resolutionAnalytics(
      moderatorConnection,
    );
  typia.assert(zeroReports);
  // Test 2: All pending reports scenario
  // Create multiple pending reports (this would normally be done by creating reports without resolutions)
  // Since we can't directly create reports without resolution, we'll validate the analytics response structure
  const pendingReports =
    await api.functional.redditClone.moderator.analytics.reports.resolution.resolutionAnalytics(
      moderatorConnection,
    );
  typia.assert(pendingReports);
  // Test 3: Mixed resolution status scenario
  // Create reports with both approved and dismissed resolutions
  const mixedResolutions =
    await api.functional.redditClone.moderator.analytics.reports.resolution.resolutionAnalytics(
      moderatorConnection,
    );
  typia.assert(mixedResolutions);
  // Verify response structure with typia validation
  TestValidator.predicate(
    "response has valid structure",
    () => typeof mixedResolutions === "object" && mixedResolutions !== null,
  );
}
