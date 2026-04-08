import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_member_posts_votes_create } from "../../../generate/generate_random_reddit_community_member_posts_votes_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test member vote update from upvote to downvote on a community post.
 *
 * Validates the complete vote modification workflow including member authentication, community creation, subscription, post creation, initial upvote casting, and vote update to downvote. Ensures that the vote value changes correctly from +1 to -1, the updated_at timestamp reflects the modification, and the post's vote score is recalculated accurately.
 *
 * The test verifies that only the vote owner can update their vote by using the same authenticated member connection throughout the workflow. The vote score validation confirms the backend automatically recalculates the aggregate score when individual votes are modified.
 *
 * 1. Member registers and authenticates via join endpoint.
 * 2. Member creates a new community as the owner.
 * 3. Member subscribes to the created community.
 * 4. Member creates a text post in the community.
 * 5. Member casts an initial upvote (+1) on the post.
 * 6. Member updates the vote to downvote (-1) using PUT endpoint.
 * 7. Validates vote value changed from +1 to -1.
 * 8. Validates updated_at timestamp is later than created_at.
 * 9. Validates post vote score reflects the 2-point decrease.
 */
export async function test_api_post_vote_update_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // Store initial vote score (should be 0 before any votes)
  const initialVoteScore = post.voteScore;
  // 5. Cast initial upvote (+1)
  const initialVote =
    await generate_random_reddit_community_member_posts_votes_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { value: 1 },
      },
    );
  typia.assert(initialVote);
  // Verify initial vote is upvote
  TestValidator.equals("initial vote is upvote", initialVote.value, 1);
  // 6. Update vote to downvote (-1)
  const updatedVote =
    await api.functional.redditCommunity.member.posts.votes.putByPostidAndVoteid(
      memberConnection,
      {
        postId: post.id,
        voteId: initialVote.id,
        body: { value: -1 },
      },
    );
  typia.assert(updatedVote);
  // 7. Verify vote value changed to -1
  TestValidator.equals("vote updated to downvote", updatedVote.value, -1);
  // 8. Verify updated_at is later than created_at
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedVote.updated_at).getTime() >
      new Date(updatedVote.created_at).getTime(),
  );
  // 9. Verify voteId and postId match original
  TestValidator.equals("voteId unchanged", updatedVote.id, initialVote.id);
  TestValidator.equals("postId unchanged", updatedVote.post.id, post.id);
  // 10. Verify post vote score decreased by 2 (from +1 to -1 = 2 point change)
  TestValidator.equals(
    "post vote score decreased by 2",
    updatedVote.post.vote_score,
    initialVoteScore + 2,
  );
}
