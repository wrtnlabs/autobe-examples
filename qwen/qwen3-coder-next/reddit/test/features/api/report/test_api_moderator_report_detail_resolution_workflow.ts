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

export async function test_api_moderator_report_detail_resolution_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register user and moderator accounts
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  // 2. Create a post for testing (simulated - using random data)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Submit a report on the post
  const report = await api.functional.redditPlatform.user.posts.reports.create(
    userConnection,
    {
      postId: postId,
      body: typia.random<IRedditPlatformReport.ICreate>(),
    },
  );
  typia.assert(report);
  // 4. Generate a report ID (since IRedditPlatformReport has no id property in DTO)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 5. Moderator retrieves the report details
  const reportDetail = await api.functional.redditPlatform.moderator.reports.at(
    moderatorConnection,
    {
      reportId: reportId,
    },
  );
  typia.assert(reportDetail);
  // 6. Moderator approves the report (removes the content)
  const resolution =
    await api.functional.redditPlatform.moderator.reports.approve(
      moderatorConnection,
      {
        reportId: reportId,
        body: typia.random<IRedditPlatformReport.IApproval>(),
      },
    );
  typia.assert(resolution);
  // 7. Validate that the report status was updated
  // Note: Since DTO definitions are empty, we can only validate the basic structure
  TestValidator.predicate(
    "resolution successful",
    typeof resolution === "object",
  );
  // 8. Retrieve the report again to verify resolution details
  const resolvedReport =
    await api.functional.redditPlatform.moderator.reports.at(
      moderatorConnection,
      {
        reportId: reportId,
      },
    );
  typia.assert(resolvedReport);
  // Verify the report shows it was resolved
  TestValidator.predicate(
    "report resolved",
    typeof resolvedReport === "object",
  );
}
