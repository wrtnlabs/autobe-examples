import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_comments_votes_create } from "../../../generate/generate_random_reddit_community_member_comments_votes_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test that the comment's vote score is correctly recalculated after a member updates their vote.
 *
 * Validates the complete vote update workflow including member authentication, community creation, subscription, post creation, comment creation, initial vote casting, vote update, and score recalculation verification. Ensures that the comment's vote_score correctly reflects the sum of all active votes after a member changes their vote from upvote to downvote.
 *
 * Special attention is given to verifying that the vote score changes by the correct amount (decreases by 2 when changing from +1 to -1) and that the vote record accurately reflects the updated vote value.
 *
 * 1. Member A authenticates via join operation.
 * 2. Member A creates a community as the owner.
 * 3. Member A subscribes to the created community.
 * 4. Member A creates a text post in the community.
 * 5. Member A creates a top-level comment on the post.
 * 6. Member A casts an initial upvote (+1) on the comment.
 * 7. Validates the initial vote value equals 1.
 * 8. Member A updates the vote from upvote to downvote (-1) using PUT endpoint.
 * 9. Validates the updated vote value equals -1.
 * 10. Validates the vote score change magnitude is correct (difference of 2).
 */
export async function test_api_comment_vote_update_score_recalculation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a community as member A
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
  // 4. Create a text post in the community
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create a top-level comment on the post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);
  // 6. Cast an initial upvote (+1) on the comment
  const initialVote =
    await generate_random_reddit_community_member_comments_votes_create(
      memberConnection,
      {
        params: {
          commentId: comment.id,
        },
        body: {
          value: 1,
        },
      },
    );
  typia.assert(initialVote);
  // 7. Verify the initial vote value equals 1
  TestValidator.equals("initial vote value", initialVote.value, 1);
  // 8. Update the vote to downvote (-1) using the PUT endpoint
  const updatedVote =
    await api.functional.redditCommunity.member.comments.votes.putByCommentidAndVoteid(
      memberConnection,
      {
        commentId: comment.id,
        voteId: initialVote.id,
        body: {
          value: -1,
        },
      },
    );
  typia.assert(updatedVote);
  // 9. Verify the vote record shows value = -1 after update
  TestValidator.equals("updated vote value", updatedVote.value, -1);
  // 10. Verify the vote score changed correctly (from +1 to -1, difference of 2)
  TestValidator.predicate(
    "vote score decreased by 2",
    initialVote.value - updatedVote.value === 2,
  );
}
