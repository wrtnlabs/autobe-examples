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

export async function test_api_thread_analysis_empty_thread(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  // Generate a random UUID for testing thread analysis on a non-existent post
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Test thread analysis endpoint with a post that has no comments
  const threadAnalysis =
    await api.functional.redditPlatform.user.posts.comments.thread_analysis.threadAnalysis(
      userConnection,
      {
        postId: postId,
      },
    );
  typia.assert(threadAnalysis);
  // For empty thread analysis, the endpoint should return valid structure
  // The exact validation depends on the actual response structure of IRedditPlatformComment
  // Since IRedditPlatformComment is defined as an empty object in the DTO,
  // we validate that the response is properly structured
  TestValidator.predicate(
    "response is valid object",
    typeof threadAnalysis === "object",
  );
}
