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
import { generate_random_reddit_platform_posts_comments_create } from "../../../generate/generate_random_reddit_platform_posts_comments_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";

export async function test_api_comment_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for authenticated user
  const userConnection: api.IConnection = { host: connection.host };
  // Step 1: User registration
  const joinInput = {} satisfies IRedditPlatformUser.IJoin;
  const userAuth = await authorize_user_join(userConnection, {
    body: joinInput,
  });
  typia.assert(userAuth);
  // Verify authentication token was set in connection headers
  TestValidator.predicate(
    "auth token set",
    () => userConnection.headers?.Authorization !== undefined,
  );
  // Step 2: Use existing post ID from test fixture
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create a comment on the post
  const commentContent = RandomGenerator.paragraph({ sentences: 1 });
  const createCommentInput = {} satisfies IRedditPlatformComment.ICreate;
  const createdComment =
    await api.functional.redditPlatform.posts.comments.create(userConnection, {
      postId: postId,
      body: createCommentInput,
    });
  // Step 4: Validate comment was created successfully
  typia.assert(createdComment);
}
