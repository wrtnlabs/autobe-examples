import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
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
import { generate_random_reddit_platform_user_posts_create } from "../../../generate/generate_random_reddit_platform_user_posts_create";
import { generate_random_reddit_platform_user_posts_reports_create } from "../../../generate/generate_random_reddit_platform_user_posts_reports_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_creation_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create reporter connection
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(reporterConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  // Create post-author connection
  const postAuthorConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(postAuthorConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  // Create a post by the post-author user using SDK function directly
  const post = await api.functional.redditPlatform.user.posts.create(
    postAuthorConnection,
    {
      body: typia.random<IRedditPlatformPost.ICreate>(),
    },
  );
  typia.assert(post);
  // Since IRedditPlatformPost has no properties defined, use typia.random for postId
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Reporter creates a report on the post
  const report =
    await generate_random_reddit_platform_user_posts_reports_create(
      reporterConnection,
      {
        params: { postId: postId },
        body: typia.random<IRedditPlatformReport.ICreate>(),
      },
    );
  typia.assert(report);
}
