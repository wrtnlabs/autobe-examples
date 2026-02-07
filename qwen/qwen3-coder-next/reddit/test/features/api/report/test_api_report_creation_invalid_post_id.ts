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

export async function test_api_report_creation_invalid_post_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a user via POST /redditPlatform/auth/user/join
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  // 2. Attempt to report a post with a valid format but non-existent UUID
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("should reject non-existent post ID", async () => {
    await api.functional.redditPlatform.user.posts.reports.create(
      userConnection,
      {
        postId: nonExistentPostId,
        body: typia.random<IRedditPlatformReport.ICreate>(),
      },
    );
  });
}
