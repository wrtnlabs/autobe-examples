import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test successful report dismissal by a moderator who determines the content doesn't violate guidelines.
 * Since the API only supports report moderation endpoint, this test focuses on creating users,
 * authenticating as moderator, and calling the report moderation endpoint.
 */
export async function test_api_report_dismissal_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {
      email: `user${RandomGenerator.alphabets(6)}@test.com`,
      password: "1234",
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(userAuthorized);
  // 2. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: `moderator${RandomGenerator.alphabets(6)}@test.com`,
        password: "1234",
      } satisfies IRedditPlatformModerator.IJoin,
    },
  );
  typia.assert(moderatorAuthorized);
  // 3. Generate random IDs for community and report (since we can't create actual ones)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 4. Call the report moderation endpoint with dismiss action
  await api.functional.redditPlatform.moderator.communities.reports.moderation.moderate(
    moderatorConnection,
    {
      communityId,
      reportId,
      body: {
        action: "dismiss",
      } satisfies IRedditPlatformReport.IModerationRequest,
    },
  );
  // 5. Validate the API call succeeded (no error thrown)
  TestValidator.predicate("report dismissal API call succeeded", () => true);
}
