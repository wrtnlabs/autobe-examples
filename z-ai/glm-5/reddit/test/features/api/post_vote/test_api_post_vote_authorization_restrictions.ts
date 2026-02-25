import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_votes_vote } from "../../../generate/generate_random_community_member_posts_votes_vote";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";
import { prepare_random_community_post_vote } from "../../../prepare/prepare_random_community_post_vote";

/**
 * Test post vote authorization restrictions.
 *
 * This test validates business rule violations for:
 * 1. Self-voting prevention - users cannot vote on their own posts
 * 2. Verify post vote metrics remain unchanged after failed authorization attempts
 */
export async function test_api_post_vote_authorization_restrictions(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // Scenario 1: Self-voting Prevention Test
  // ========================================
  // 1. Create member account who will be community owner and post author
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Owner creates a community
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Owner creates a post in the community
  // Note: Owner is automatically subscribed to their own community
  const post = await generate_random_community_member_communities_posts_create(
    ownerConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // Verify initial post state (author's auto-upvote on creation)
  TestValidator.equals("initial vote score", post.voteScore, 1);
  TestValidator.equals("initial upvote count", post.upvoteCount, 1);
  TestValidator.equals("initial downvote count", post.downvoteCount, 0);
  // 4. Owner attempts to upvote their own post - should fail with 403 Forbidden
  await TestValidator.httpError(
    "self-upvote should be forbidden",
    403,
    async () =>
      await api.functional.community.member.posts.votes.vote(ownerConnection, {
        postId: post.id,
        body: { vote: 1 } satisfies ICommunityPostVote.ICreate,
      }),
  );
  // 5. Verify post vote metrics unchanged after failed self-upvote attempt
  TestValidator.equals(
    "vote score unchanged after self-upvote attempt",
    post.voteScore,
    1,
  );
  TestValidator.equals(
    "upvote count unchanged after self-upvote attempt",
    post.upvoteCount,
    1,
  );
  TestValidator.equals(
    "downvote count unchanged after self-upvote attempt",
    post.downvoteCount,
    0,
  );
  // 6. Owner attempts to downvote their own post - should also fail with 403 Forbidden
  await TestValidator.httpError(
    "self-downvote should be forbidden",
    403,
    async () =>
      await api.functional.community.member.posts.votes.vote(ownerConnection, {
        postId: post.id,
        body: { vote: -1 } satisfies ICommunityPostVote.ICreate,
      }),
  );
  // 7. Verify post vote metrics still unchanged after failed self-downvote attempt
  TestValidator.equals(
    "vote score unchanged after self-downvote attempt",
    post.voteScore,
    1,
  );
  TestValidator.equals(
    "upvote count unchanged after self-downvote attempt",
    post.upvoteCount,
    1,
  );
  TestValidator.equals(
    "downvote count unchanged after self-downvote attempt",
    post.downvoteCount,
    0,
  );
  // ========================================
  // Scenario 2: Another user CAN vote on owner's post
  // ========================================
  // 8. Create another member who can legitimately vote
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // 9. Voter subscribes to the community by creating their own post
  // (creating a post auto-subscribes the author)
  const voterPost =
    await generate_random_community_member_communities_posts_create(
      voterConnection,
      {
        params: { communityName: community.name },
      },
    );
  typia.assert(voterPost);
  // 10. Voter upvotes owner's post - should succeed
  const vote = await api.functional.community.member.posts.votes.vote(
    voterConnection,
    {
      postId: post.id,
      body: { vote: 1 } satisfies ICommunityPostVote.ICreate,
    },
  );
  typia.assert(vote);
  // 11. Verify vote was recorded correctly
  TestValidator.equals("vote direction", vote.isUpvote, true);
  TestValidator.equals("voter is correct", vote.member.id, voter.id);
  TestValidator.equals("post is correct", vote.post.id, post.id);
}
