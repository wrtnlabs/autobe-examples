import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { generate_random_community_platform_user_posts_votes_create_vote } from "../../../generate/generate_random_community_platform_user_posts_votes_create_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_voting_remove_vote(
  connection: api.IConnection,
): Promise<void> {
  /*
      Test removing an existing vote on a post by:
      1. Register a new user and authorize
      2. Create a community
      3. Create a post in that community by the user
      4. Cast an initial vote (upvote or downvote)
      5. Remove the vote by setting vote_type to empty string "" or some remove indicator
      6. Verify the vote record is removed,
         the post vote count updates,
         and the user's karma is adjusted accordingly
    */
  // 1. Register User
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(authorizedUser);
  userConnection.headers ??= {};
  userConnection.headers.Authorization = authorizedUser.token.access;
  // 2. Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      { body: { name: `testcommunity_${RandomGenerator.alphabets(5)}` } },
    );
  typia.assert(community);
  // 3. Create a post
  // Prepare a text post since ICommunityPlatformPost.ICreate union is unknown, create a minimal one
  const postCreateBody = {
    title: RandomGenerator.name(3),
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      { communityId: community.id, body: postCreateBody },
    );
  typia.assert(post);
  // 4. Cast an initial vote (randomly choose upvote or downvote)
  const voteTypes = ["upvote", "downvote"] as const;
  const initialVoteType = RandomGenerator.pick(voteTypes);
  const initialVote =
    await generate_random_community_platform_user_posts_votes_create_vote(
      userConnection,
      {
        params: { postId: post.id },
        body: { post_id: post.id, vote_type: initialVoteType },
      },
    );
  typia.assert(initialVote);
  // Calculate expected vote counts after initial vote
  const expectedUpvotes = initialVoteType === "upvote" ? 1 : 0;
  const expectedDownvotes = initialVoteType === "downvote" ? 1 : 0;
  // 5. Remove the vote by send the vote_type as empty string ""
  // Assuming API treats empty vote_type to remove vote
  const removeVoteBody = {
    post_id: post.id,
    vote_type: "", // Remove vote indication
  } satisfies ICommunityPlatformPostVote.ICreate;
  const removeVoteResponse =
    await generate_random_community_platform_user_posts_votes_create_vote(
      userConnection,
      { params: { postId: post.id }, body: removeVoteBody },
    );
  typia.assert(removeVoteResponse);
  // After removal, both upvotes and downvotes should be 0
  TestValidator.equals(
    "upvotes after vote removal",
    removeVoteResponse.upvotes,
    0,
  );
  TestValidator.equals(
    "downvotes after vote removal",
    removeVoteResponse.downvotes,
    0,
  );
  // 6. Check user's karma after removal
  // Fetch user's authorized information again and check karma
  // We assume there is a /user/profile or /user/me endpoint to get user info
  // However, not provided in APIs. We'll assume the authorizedUser object karma should not increase due to removal of vote
  // To check the karma score change, create a utility function to login and get me info is unavailable, so skip karma checking
  // Instead, check that vote removal resets votes correctly
}
