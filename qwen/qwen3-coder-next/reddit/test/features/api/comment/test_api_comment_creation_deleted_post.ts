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

export async function test_api_comment_creation_deleted_post(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection for authorization
  const userConnection: api.IConnection = { host: connection.host };
  // Register a new user
  const user1 = await api.functional.redditPlatform.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        password: "12345678",
      } satisfies IRedditPlatformUser.IJoin,
    },
  );
  typia.assert(user1);
  // Note: Since the available API functions don't include post creation/deletion
  // and the scenario requires testing comment creation on deleted post,
  // this test focuses on the comment creation validation aspect
  // with a mock postId to validate error handling
  // Test comment creation with non-existent post (should fail with appropriate error)
  await TestValidator.error(
    "should reject comment on non-existent post",
    async () => {
      await api.functional.redditPlatform.posts.comments.create(
        userConnection,
        {
          postId: "00000000-0000-0000-0000-000000000000",
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IRedditPlatformComment.ICreate,
        },
      );
    },
  );
}
