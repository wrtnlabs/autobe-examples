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

export async function test_api_report_moderation_dismiss(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: "moderator@test.com",
      password: "1234",
      username: "moderator",
    } satisfies IRedditPlatformModerator.IJoin,
  });
  // 2. Authenticate as user to create a post and report
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: "user@test.com",
      password: "1234",
      username: "testuser",
    } satisfies IRedditPlatformUser.IJoin,
  });
  // 3. User creates a post (for reporting)
  const post = await api.functional.redditPlatform.user.posts.reports.create(
    userConnection,
    {
      postId: "123e4567-e89b-12d3-a456-426614174000",
      body: {
        reason: "spam",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(post);
  // 4. Moderator dismisses the report
  const result = await api.functional.redditPlatform.moderator.reports.manage(
    moderatorConnection,
    {
      body: {
        report_id: (post as any).id,
        action: "dismiss",
      } satisfies IRedditPlatformReport.IAction,
    },
  );
  typia.assert(result);
  // 5. Verify report was dismissed
  TestValidator.equals("report dismissed", (result as any).action, "dismiss");
}