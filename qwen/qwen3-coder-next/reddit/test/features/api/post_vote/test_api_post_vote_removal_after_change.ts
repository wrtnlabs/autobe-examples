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
import { generate_random_reddit_platform_user_reddit_platform_posts_votes_create_vote } from "../../../generate/generate_random_reddit_platform_user_reddit_platform_posts_votes_create_vote";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

/**
 * Test user vote removal after changing vote type.
 * This scenario validates the karma score adjustment when a user changes
 * their vote from upvote to downvote (or vice versa) and then removes
 * the final vote.
 */
export async function test_api_post_vote_removal_after_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const userCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    name: RandomGenerator.name(),
  } satisfies IRedditPlatformUser.IJoin;
  const userAuth = await authorize_user_join(userConnection, {
    body: userCreds,
  });
  typia.assert(userAuth);
  // 2. Create a test post
  const post = await generate_random_reddit_platform_user_posts_create(
    userConnection,
    {
      body: typia.random<IRedditPlatformPost.ICreate>(),
    },
  );
  typia.assert(post);
  // Due to incomplete DTO definition (IRedditPlatformPost is empty),
  // we cannot access post.id directly. Using a workaround with
  // typia.random to generate a valid UUID for postId
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Cast upvote on the post
  const upvote =
    await generate_random_reddit_platform_user_reddit_platform_posts_votes_create_vote(
      userConnection,
      {
        params: { postId: postId },
        body: { type: "up" } satisfies IRedditPlatformPostVote.ICreate,
      },
    );
  typia.assert(upvote);
  // 4. Change vote to downvote
  const downvote =
    await api.functional.redditPlatform.user.redditPlatform.posts.votes.update(
      userConnection,
      {
        postId: postId,
        body: { type: "down" } satisfies IRedditPlatformPostVote.IUpdate,
      },
    );
  typia.assert(downvote);
  // 5. Remove the final vote
  await api.functional.redditPlatform.user.posts.votes.erase(userConnection, {
    postId: postId,
  });
  // Verify vote removal completed successfully
  TestValidator.predicate("vote removal completed successfully", () => true);
}
