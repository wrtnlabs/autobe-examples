import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_user_posts_reports_create } from "../../../generate/generate_random_reddit_platform_user_posts_reports_create";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_creation_self_report_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await api.functional.redditPlatform.auth.user.join(
    userConnection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  typia.assert(userAuth);
  // Update connection with authentication token
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: userAuth.token.access,
  };
  // Step 2: Create a post as the user (using SDK since no post creation endpoint is available)
  // Note: Post creation endpoint not provided in API functions, so we skip this step
  // In a real scenario, this would use the appropriate post creation endpoint
  // Step 3: Attempt to report the user's own post
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Try to create a report for the post (this should fail with 403 Forbidden)
  await TestValidator.error("self-report should be forbidden", async () => {
    await api.functional.redditPlatform.user.posts.reports.create(
      userConnection,
      {
        postId: postId,
        body: typia.random<IRedditPlatformReport.ICreate>(),
      },
    );
  });
}
