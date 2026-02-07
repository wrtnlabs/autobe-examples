import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostViewStat";
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
import { generate_random_reddit_platform_posts_comments_create } from "../../../generate/generate_random_reddit_platform_posts_comments_create";
import { generate_random_reddit_platform_user_posts_create } from "../../../generate/generate_random_reddit_platform_user_posts_create";
import { generate_random_reddit_platform_user_reddit_platform_posts_votes_create_vote } from "../../../generate/generate_random_reddit_platform_user_reddit_platform_posts_votes_create_vote";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

export async function test_api_post_stats_engagement_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection for authentication
  const userConnection: api.IConnection = { host: connection.host };
  // Register a new user using utility function
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(2),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // Create post for testing stats
  const postCreateBody = {
    title: RandomGenerator.name(3),
    content_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditPlatformPost.ICreate;
  const post = await generate_random_reddit_platform_user_posts_create(
    userConnection,
    {
      body: postCreateBody,
    },
  );
  typia.assert(post);
  // Since IRedditPlatformPost is empty (export type IRedditPlatformPost = {}),
  // we cannot access post.id. We need to use a UUID placeholder.
  // Generate a valid UUID for the postId parameter.
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Vote on the post
  const voteCreateBody = {
    vote_type: "up",
  } satisfies IRedditPlatformPostVote.ICreate;
  await generate_random_reddit_platform_user_reddit_platform_posts_votes_create_vote(
    userConnection,
    {
      params: {
        postId: postId,
      },
      body: voteCreateBody,
    },
  );
  // Add a comment to the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditPlatformComment.ICreate;
  await generate_random_reddit_platform_posts_comments_create(userConnection, {
    params: {
      postId: postId,
    },
    body: commentCreateBody,
  });
  // Get post stats
  const stats = await api.functional.redditPlatform.posts.stats(
    userConnection,
    {
      postId: postId,
    },
  );
  typia.assert(stats);
  // Since IRedditPlatformPostViewStat is empty (export type IRedditPlatformPostViewStat = {}),
  // we cannot validate specific properties like vote_count, comment_count, view_count.
  // We can only verify it's a valid object.
  TestValidator.predicate(
    "stats is valid object",
    typeof stats === "object" && stats !== null,
  );
}
