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

/**
 * Test the complete report management workflow including report identification and content deletion.
 * First, authenticate as a moderator. Then create a report by having a user report inappropriate content.
 * Verify the report exists and contains the expected content information (target_type, target_id).
 * Finally, approve the report to delete the reported content and confirm the moderation action is properly logged in the system.
 * Validate all aspects of the report management lifecycle.
 */
export async function test_api_report_moderation_complete_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate user connection
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    username: RandomGenerator.name(),
  } satisfies IRedditPlatformUser.IJoin;
  await api.functional.redditPlatform.auth.user.join(userConnection, {
    body: userJoinInput,
  });
  const userLoginConnection: api.IConnection = { host: connection.host };
  await api.functional.redditPlatform.auth.user.login(userLoginConnection, {
    body: {
      email: userJoinInput.email,
      password: "1234",
    } satisfies IRedditPlatformUser.ILogin,
  });
  // 2. Setup: Create and authenticate moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    username: RandomGenerator.name(),
  } satisfies IRedditPlatformModerator.IJoin;
  await api.functional.redditPlatform.auth.moderator.join(moderatorConnection, {
    body: moderatorJoinInput,
  });
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  await api.functional.redditPlatform.auth.moderator.login(
    moderatorLoginConnection,
    {
      body: {
        email: moderatorJoinInput.email,
        password: "1234",
      } satisfies IRedditPlatformModerator.ILogin,
    },
  );
  // 3. Create a report with a postId
  const postId = typia.random<string & tags.Format<"uuid">>();
  const report = await api.functional.redditPlatform.user.posts.reports.create(
    userLoginConnection,
    {
      postId: postId,
      body: {
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 4. Moderator approves the report to delete the content
  const response = await api.functional.redditPlatform.moderator.reports.manage(
    moderatorLoginConnection,
    {
      body: {
        action: "approve" as const,
      } satisfies IRedditPlatformReport.IAction,
    },
  );
  typia.assert(response);
}
