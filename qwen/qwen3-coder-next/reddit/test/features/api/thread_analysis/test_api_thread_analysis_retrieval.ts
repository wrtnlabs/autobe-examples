import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_thread_analysis_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for user registration
  const userConnection: api.IConnection = { host: connection.host };
  // Register a new user to obtain authentication token
  const userAuth = await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  typia.assert(userAuth);
  // Create a dummy post ID for thread analysis
  // Since there's no API to create posts, we'll use a dummy UUID
  const postId: string = typia.random<string & tags.Format<"uuid">>();
  // Retrieve thread analysis for the post
  const threadAnalysis =
    await api.functional.redditPlatform.user.posts.comments.thread_analysis.threadAnalysis(
      userConnection,
      {
        postId: postId,
      },
    );
  typia.assert(threadAnalysis);
}
