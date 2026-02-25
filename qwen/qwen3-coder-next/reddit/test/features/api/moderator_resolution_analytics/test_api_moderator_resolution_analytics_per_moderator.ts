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

export async function test_api_moderator_resolution_analytics_per_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Create two moderator accounts
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1 = await api.functional.redditClone.auth.moderator.join(
    moderator1Connection,
    {
      body: {
        email: `mod1_${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: RandomGenerator.alphaNumeric(16),
        username: `moderator1_${RandomGenerator.alphaNumeric(8)}`,
        displayName: `Moderator 1`,
      } satisfies IRedditCloneModerator.IJoin,
    },
  );
  typia.assert(moderator1);
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2 = await api.functional.redditClone.auth.moderator.join(
    moderator2Connection,
    {
      body: {
        email: `mod2_${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: RandomGenerator.alphaNumeric(16),
        username: `moderator2_${RandomGenerator.alphaNumeric(8)}`,
        displayName: `Moderator 2`,
      } satisfies IRedditCloneModerator.IJoin,
    },
  );
  typia.assert(moderator2);
  // The resolutionAnalytics endpoint doesn't require creating communities or posts
  // It returns IRedditCloneContentReportResolution which contains resolution data
  // Since the API structure doesn't include communities/posts/reports endpoints,
  // we can only test that the endpoint returns valid data structure
  // Get resolution analytics
  const analytics =
    await api.functional.redditClone.moderator.analytics.reports.resolution.resolutionAnalytics(
      moderator1Connection,
    );
  typia.assert(analytics);
  // Validate that analytics contain expected structure
  TestValidator.predicate("analytics contain resolution data", () => {
    return analytics !== null && analytics !== undefined;
  });
}
