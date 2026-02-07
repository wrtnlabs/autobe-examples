import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
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

export async function test_api_post_vote_update_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(user);
  // 2. Create a post
  const post = await api.functional.redditPlatform.user.posts.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.name(),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Attempt to update non-existent vote
  await TestValidator.error(
    "non-existent vote update should fail with 404",
    async () => {
      await api.functional.redditPlatform.user.redditPlatform.posts.votes.update(
        userConnection,
        {
          postId: (post as IEntity).id,
          body: {
            vote_type: "upvote",
          } satisfies IRedditPlatformPostVote.IUpdate,
        },
      );
    },
  );
}