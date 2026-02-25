import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_votes_create } from "../../../generate/generate_random_community_platform_user_posts_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_retrieval_change_history(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(user);
  // Create community for posting
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Create post for voting
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // Cast initial upvote
  const initialVote =
    await generate_random_community_platform_user_posts_votes_create(
      userConnection,
      {
        params: { postId: post.id },
        body: { vote_type: "upvote" },
      },
    );
  typia.assert(initialVote);
  // Wait briefly to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Update vote to downvote
  const updatedVote =
    await api.functional.communityPlatform.user.posts.votes.update(
      userConnection,
      {
        postId: post.id,
        voteId: initialVote.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // Retrieve vote details
  const retrievedVote =
    await api.functional.communityPlatform.user.posts.votes.at(userConnection, {
      postId: post.id,
      voteId: initialVote.id,
    });
  typia.assert(retrievedVote);
  // Validate vote type changed to downvote
  TestValidator.equals(
    "vote type should be downvote",
    retrievedVote.vote_type,
    "downvote",
  );
  // Validate user relationship
  TestValidator.equals("user id should match", retrievedVote.user.id, user.id);
  TestValidator.equals("post id should match", retrievedVote.post.id, post.id);
  // Validate timestamp updates
  TestValidator.equals(
    "created_at should remain unchanged",
    retrievedVote.created_at,
    initialVote.created_at,
  );
  TestValidator.notEquals(
    "updated_at should be different from created_at",
    retrievedVote.updated_at,
    retrievedVote.created_at,
  );
  // Validate updated_at is after created_at
  const createdAtDate = new Date(retrievedVote.created_at);
  const updatedAtDate = new Date(retrievedVote.updated_at);
  TestValidator.predicate(
    "updated_at should be after created_at",
    updatedAtDate > createdAtDate,
  );
  // Validate vote ID consistency
  TestValidator.equals(
    "vote ID should remain unchanged",
    retrievedVote.id,
    initialVote.id,
  );
}
