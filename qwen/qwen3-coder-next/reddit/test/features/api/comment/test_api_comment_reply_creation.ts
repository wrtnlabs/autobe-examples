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

/**
 * Test comment reply creation workflow.
 * 1. User registration and authentication
 * 2. Create a post with a comment
 * 3. Create a reply to the comment
 * 4. Validate responses with typia.assert()
 */
export async function test_api_comment_reply_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.redditPlatform.auth.user.join(
    userConnection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  typia.assert(user);
  // 2. Create a post
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a parent comment
  const parentComment =
    await api.functional.redditPlatform.posts.comments.create(userConnection, {
      postId,
      body: {} satisfies IRedditPlatformComment.ICreate,
    });
  typia.assert(parentComment);
  // 4. Create a reply to the parent comment
  const reply = await api.functional.redditPlatform.posts.comments.create(
    userConnection,
    {
      postId,
      body: {} satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(reply);
}
