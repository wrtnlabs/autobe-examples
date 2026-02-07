import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
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
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test link post creation with valid URL in a subscribed community.
 * Creates a link post and validates successful creation through response structure validation.
 */
export async function test_api_reddit_platform_link_post_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new user
  const userConnection: api.IConnection = { host: connection.host };
  const authResponse = await api.functional.redditPlatform.auth.user.join(
    userConnection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  typia.assert(authResponse);
  // 2. Create a link post with valid URL
  const post = await api.functional.redditPlatform.user.posts.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "link",
        url: "https://example.com/test-post" satisfies string &
          tags.Format<"url">,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Verify response structure is valid
  TestValidator.predicate(
    "post is defined",
    post !== null && post !== undefined,
  );
}
