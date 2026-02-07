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

export async function test_api_moderator_report_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  const moderatorLoginInput = {
    ...typia.random<IRedditPlatformModerator.ILogin>(),
  } satisfies IRedditPlatformModerator.ILogin;
  await authorize_moderator_login(moderatorConnection, {
    body: moderatorLoginInput,
  });
  // 2. Setup user account
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  const userLoginInput = {
    ...typia.random<IRedditPlatformUser.ILogin>(),
  } satisfies IRedditPlatformUser.ILogin;
  await authorize_user_login(userConnection, {
    body: userLoginInput,
  });
  // 3. User submits a report
  const report = await api.functional.redditPlatform.user.posts.reports.create(
    userConnection,
    {
      postId: typia.random<string>(),
      body: {
        reason: RandomGenerator.pick([
          "spam",
          "harassment",
          "false_info",
          "copyright",
          "other",
        ] as const),
        details: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 4. Moderator retrieves report details
  const reportDetail = await api.functional.redditPlatform.moderator.reports.at(
    moderatorConnection,
    {
      reportId: (report as unknown as { id: string }).id,
    },
  );
  typia.assert(reportDetail);
  // 5. Validate report details
  TestValidator.equals("report ID matches", (reportDetail as unknown as { id: string }).id, (report as unknown as { id: string }).id);
  TestValidator.predicate("has reporter ID", (reportDetail as unknown as { reporter_id: string }).reporter_id !== null);
  TestValidator.equals("status is pending", (reportDetail as unknown as { status: string }).status, "pending");
  TestValidator.predicate(
    "has valid timestamp",
    (reportDetail as unknown as { created_at?: string }).created_at !== undefined,
  );
}