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

export async function test_api_post_vote_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user via registration using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  typia.assert(joinResult);
  // 2. Create a post using utility function
  const postResult = await generate_random_reddit_platform_user_posts_create(
    userConnection,
    {
      body: typia.random<IRedditPlatformPost.ICreate>(),
    },
  );
  typia.assert(postResult);
  // 3. Create initial vote by updating (upvote)
  const initialVoteResult =
    await api.functional.redditPlatform.user.redditPlatform.posts.votes.update(
      userConnection,
      {
        postId: (postResult as any).id,
        body: { vote_type: "upvote" } satisfies IRedditPlatformPostVote.IUpdate,
      },
    );
  typia.assert(initialVoteResult);
  // 4. Update vote (from upvote to downvote)
  const updateResult =
    await api.functional.redditPlatform.user.redditPlatform.posts.votes.update(
      userConnection,
      {
        postId: (postResult as any).id,
        body: {
          vote_type: "downvote",
        } satisfies IRedditPlatformPostVote.IUpdate,
      },
    );
  typia.assert(updateResult);
  // 5. Verify vote was updated
  TestValidator.equals(
    "vote type updated",
    (updateResult as any).vote_type,
    "downvote",
  );
}
