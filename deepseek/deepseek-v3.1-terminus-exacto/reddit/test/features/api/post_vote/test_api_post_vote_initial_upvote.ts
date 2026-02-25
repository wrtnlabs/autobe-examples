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

export async function test_api_post_vote_initial_upvote(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate User A (non-author voter)
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuthorized = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAAuthorized);
  // Step 2: Create a test community
  const community =
    await generate_random_community_platform_user_communities_create(
      userAConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Authenticate User B (post author)
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuthorized = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userBAuthorized);
  // Step 4: User B creates a post in the community
  const post = await generate_random_community_platform_user_posts_create(
    userBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Store initial vote count
  const initialVoteCount = post.votes_count;
  // Step 5: User A votes on the post with vote_type: 'upvote'
  const vote = await api.functional.communityPlatform.user.posts.votes.create(
    userAConnection,
    {
      postId: post.id,
      body: {
        vote_type: "upvote" as const,
      } satisfies ICommunityPlatformPostVote.ICreate,
    },
  );
  typia.assert(vote);
  // Step 6: Validate response contains correct vote_type 'upvote', created_at timestamp, user and post summaries
  TestValidator.equals("vote type should be upvote", vote.vote_type, "upvote");
  TestValidator.predicate("created_at should be valid timestamp", () => {
    const date = new Date(vote.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "user summary should match voter",
    vote.user.id,
    userAAuthorized.id,
  );
  TestValidator.equals(
    "post summary should match voted post",
    vote.post.id,
    post.id,
  );
  // Step 7: Verify the post's vote count increased by +1
  // Note: We can't directly validate the vote count increase since we don't have
  // an endpoint to retrieve updated post information. The scenario mentions
  // this validation but the API doesn't provide a way to verify it.
  // Step 8: Verify the author's karma increased by +1 (initial upvote)
  // Note: We can't validate karma increase since there's no endpoint to retrieve
  // updated user information. The scenario mentions this but API doesn't support it.
  // Step 9: Validate that User A cannot vote again on same post (one-vote-per-user constraint)
  const secondVote =
    await api.functional.communityPlatform.user.posts.votes.create(
      userAConnection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote" as const, // Try to change vote type
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(secondVote);
  // Should update existing vote rather than create new one
  TestValidator.equals(
    "vote ID should be same (update not create)",
    vote.id,
    secondVote.id,
  );
  TestValidator.equals(
    "vote type should be updated to downvote",
    secondVote.vote_type,
    "downvote",
  );
  TestValidator.notEquals(
    "updated_at should be different after vote change",
    vote.updated_at,
    secondVote.updated_at,
  );
}
