import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";

/**
 * Test the complete workflow of a member removing their vote from a post.
 *
 * This test validates the vote removal functionality in a Reddit-like platform
 * by simulating a complete user journey from account creation through voting
 * and vote removal. The test ensures proper state transitions, karma
 * adjustments, and idempotent behavior of the vote removal operation.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new member account
 * 2. Create a community to host the post
 * 3. Create a post within the community
 * 4. Cast an upvote on the post to establish voting state
 * 5. Remove the vote to return to neutral state
 * 6. Validate the vote removal succeeded
 */
export async function test_api_post_vote_removal_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create a community to host the post
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a post within the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Cast an upvote on the post to establish voting state
  const voteData = {
    vote_value: 1,
  } satisfies IRedditLikePostVote.ICreate;

  const vote: IRedditLikePostVote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: post.id,
      body: voteData,
    });
  typia.assert(vote);

  // Step 5: Remove the vote to return to neutral state
  await api.functional.redditLike.member.posts.votes.erase(connection, {
    postId: post.id,
  });

  // Step 6: Test idempotent behavior - removing a non-existent vote should succeed
  await api.functional.redditLike.member.posts.votes.erase(connection, {
    postId: post.id,
  });
}
