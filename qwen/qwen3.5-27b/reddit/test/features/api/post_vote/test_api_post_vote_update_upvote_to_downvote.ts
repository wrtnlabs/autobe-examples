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
 * Test that a member can successfully update their existing upvote on a post to a downvote.
 *
 * Validates the vote update workflow where a member changes their vote from upvote to downvote on a post. This tests the recalculation of the post's vote score (which should decrease by 2 points) and the author's karma (which should also decrease by 2 points).
 *
 * The test ensures that vote updates are properly tracked with timestamps and that the system correctly handles the transition from positive to negative voting.
 *
 * 1. Register and authenticate as a member.
 * 2. Subscribe to an existing community.
 * 3. Create a post in the subscribed community.
 * 4. Cast an initial upvote on the post.
 * 5. Update the vote from upvote to downvote.
 * 6. Verify the vote type changed to 'downvote'.
 * 7. Verify the updated_at timestamp is newer than created_at.
 * 8. Verify the post's vote_score decreased by 2 (from +1 to -1).
 * 9. Verify the author's karma decreased by 2.
 */
export async function test_api_post_vote_update_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Subscribe to an existing community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {},
    );
  typia.assert(subscription);
  // 3. Create a post in the subscribed community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: subscription.community.id,
      },
    },
  );
  typia.assert(post);
  // Store original karma for validation
  const originalKarma = post.author.karma;
  const originalVoteScore = post.vote_score;
  // 4. Cast an initial upvote on the post
  const upvote = await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        vote_type: "upvote",
      },
    },
  );
  typia.assert(upvote);
  // 5. Update the vote from upvote to downvote
  const downvote = await api.functional.redditClone.member.posts.votes.update(
    memberConnection,
    {
      postId: post.id,
      voteId: upvote.id,
      body: {
        vote_type: "downvote",
      } satisfies IRedditClonePostVote.IUpdate,
    },
  );
  typia.assert(downvote);
  // 6. Verify the vote type changed to 'downvote'
  TestValidator.equals("vote type is downvote", downvote.vote_type, "downvote");
  // 7. Verify the updated_at timestamp is newer than or equal to created_at
  TestValidator.predicate(
    "updated_at is newer than or equal to created_at",
    new Date(downvote.updated_at).getTime() >=
      new Date(downvote.created_at).getTime(),
  );
  // 8. Verify the post's vote_score decreased by 2 (from +1 to -1)
  // Original score + 1 (upvote) - 2 (change to downvote) = original - 1
  TestValidator.equals(
    "vote score decreased by 2 from upvote",
    downvote.post.vote_score,
    originalVoteScore - 1,
  );
  // 9. Verify the author's karma decreased by 2
  // Original karma + 1 (upvote) - 2 (change to downvote) = original - 1
  TestValidator.equals(
    "author karma decreased by 2 from upvote",
    downvote.post.author.karma,
    originalKarma - 1,
  );
}
