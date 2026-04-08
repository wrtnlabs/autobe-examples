import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_votes_create } from "../../../generate/generate_random_reddit_clone_member_posts_votes_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

/**
 * Test that a member can successfully update their existing downvote on a post to an upvote.
 *
 * Validates the complete vote update flow where a member changes their vote from downvote to upvote on a post. This test verifies that the vote type is correctly updated, the post's vote score is recalculated (increasing by 2 since changing from -1 to +1), and the author's karma is properly adjusted.
 *
 * The test follows the natural workflow: member registration, community subscription, post creation, initial downvote casting, and finally vote update to upvote. Special attention is given to verifying the mathematical correctness of score changes and timestamp updates.
 *
 * 1. Register and authenticate as a member.
 * 2. Subscribe to a community (community_id generated as UUID).
 * 3. Create a post in the subscribed community.
 * 4. Cast an initial downvote on the post.
 * 5. Update the vote from downvote to upvote.
 * 6. Validate vote type change, score calculation, and karma update.
 */
export async function test_api_post_vote_update_downvote_to_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // 2. Subscribe to a community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: undefined,
      },
    );
  typia.assert(subscription);
  const communityId = subscription.community.id;
  // 3. Create a post in the subscribed community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: communityId,
      },
    },
  );
  typia.assert(post);
  const postId = post.id;
  const initialVoteScore = post.vote_score;
  const initialKarma = post.author.karma;
  // 4. Cast an initial downvote on the post
  const downvote = await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: {
        postId: postId,
      },
      body: {
        vote_type: "downvote",
      },
    },
  );
  typia.assert(downvote);
  const voteId = downvote.id;
  // Verify initial downvote was cast correctly
  TestValidator.equals(
    "initial vote type is downvote",
    downvote.vote_type,
    "downvote",
  );
  // 5. Update the vote from downvote to upvote
  const updatedVote =
    await api.functional.redditClone.member.posts.votes.update(
      memberConnection,
      {
        postId: postId,
        voteId: voteId,
        body: {
          vote_type: "upvote",
        },
      },
    );
  typia.assert(updatedVote);
  // 6. Validate vote update
  TestValidator.equals(
    "vote type updated to upvote",
    updatedVote.vote_type,
    "upvote",
  );
  TestValidator.equals("vote postId matches", updatedVote.post.id, postId);
  TestValidator.equals("voteId unchanged", updatedVote.id, voteId);
  // Verify updated_at is after or equal to created_at
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    new Date(updatedVote.updated_at).getTime() >=
      new Date(updatedVote.created_at).getTime(),
  );
  // Verify score change based on vote response post summary
  // Changing from downvote (-1) to upvote (+1) = +2 score change
  const expectedScoreChange = 2;
  TestValidator.predicate(
    "post vote score increased by 2",
    updatedVote.post.vote_score === initialVoteScore + expectedScoreChange,
  );
  // Verify author karma increased by 2
  TestValidator.equals(
    "author karma increased by 2",
    updatedVote.post.author.karma,
    initialKarma + expectedScoreChange,
  );
}
