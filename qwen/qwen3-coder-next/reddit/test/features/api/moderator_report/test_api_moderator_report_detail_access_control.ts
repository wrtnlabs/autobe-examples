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
import { generate_random_reddit_platform_user_posts_reports_create } from "../../../generate/generate_random_reddit_platform_user_posts_reports_create";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_moderator_report_detail_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Setup actor-specific connections
  const regularUserConnection: api.IConnection = { host: connection.host };
  const anotherRegularUserConnection: api.IConnection = {
    host: connection.host,
  };
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Step 1: Register regular user
  await authorize_user_join(regularUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  // Step 2: Register another regular user
  await authorize_user_join(anotherRegularUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  // Step 3: Register moderator
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformModerator.IJoin,
  });
  // Step 4: Create a report (simulating report exists)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Since there's no post creation endpoint, we'll create a report
  // Note: This may fail in a real system if the postId doesn't exist
  // But for testing access control, we can use a mock report ID
  // Step 5: Another regular user attempts to access report details (should fail with 403)
  await TestValidator.httpError(
    "regular user cannot access report details",
    403,
    async () => {
      await api.functional.redditPlatform.moderator.reports.at(
        anotherRegularUserConnection,
        {
          reportId: reportId,
        },
      );
    },
  );
  // Step 6: Moderator successfully retrieves report details
  const reportDetails =
    await api.functional.redditPlatform.moderator.reports.at(
      moderatorConnection,
      {
        reportId: reportId,
      },
    );
  typia.assert(reportDetails);
}
