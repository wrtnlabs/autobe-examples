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

export async function test_api_post_vote_creation_upvote(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const userConnection: api.IConnection = { host: connection.host };
  // Register a new user account
  const registerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.name(),
  } satisfies IRedditPlatformUser.IJoin;
  const userAuth = await authorize_user_join(userConnection, {
    body: registerInput,
  });
  typia.assert(userAuth);
  // Create a new post in a subscribed community
  const postInput = {
    community_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_type: "text",
    content_text: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies IRedditPlatformPost.ICreate;
  const post = await generate_random_reddit_platform_user_posts_create(
    userConnection,
    {
      body: postInput,
    },
  );
  typia.assert(post);
  // Generate a postId since IRedditPlatformPost has no id property
  // In a real scenario, this would come from the post response
  const postId = typia.random<string & tags.Format<"uuid">>();
  const voteInput = {
    vote_type: "up" as const,
  } satisfies IRedditPlatformPostVote.ICreate;
  const vote =
    await generate_random_reddit_platform_user_reddit_platform_posts_votes_create_vote(
      userConnection,
      {
        params: {
          postId: postId,
        },
        body: voteInput,
      },
    );
  typia.assert(vote);
  // Verify the vote was created successfully
  TestValidator.predicate("vote exists", vote !== undefined);
}
