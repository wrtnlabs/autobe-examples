import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_thread_analysis_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderator);
  // 2. Create a test post first to ensure we have a valid post ID
  // Since we need a post to analyze, let's create one through the API
  // Note: This assumes we have a way to create posts as a moderator
  // For now, we'll use a random UUID and test error handling
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve thread analysis for a valid post (this will test the happy path)
  const threadAnalysis =
    await api.functional.redditPlatform.moderator.posts.comments.thread_analysis.threadAnalysis(
      moderatorConnection,
      {
        postId: postId,
      },
    );
  typia.assert(threadAnalysis);
  // 4. Verify thread analysis contains expected structure
  typia.assert<IRedditPlatformComment>(threadAnalysis);
  // 5. Test error handling for non-existent post
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent post should throw error",
    async () => {
      await api.functional.redditPlatform.moderator.posts.comments.thread_analysis.threadAnalysis(
        moderatorConnection,
        {
          postId: nonExistentPostId,
        },
      );
    },
  );
}
