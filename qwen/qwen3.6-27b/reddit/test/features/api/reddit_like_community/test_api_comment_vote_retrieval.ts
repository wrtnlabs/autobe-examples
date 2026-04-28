import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentVote";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_comment_votes_create } from "../../../generate/generate_random_reddit_like_community_member_comment_votes_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_comment_vote } from "../../../prepare/prepare_random_reddit_like_community_comment_vote";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";

/**
 * Tests retrieval of a specific comment vote record using its unique identifier after a complete creation workflow.
 *
 * Validates the end-to-end flow where an authenticated member establishes a community, subscribes to gain posting privileges, creates a post within that community, and adds a comment to the post. The member then casts an upvote on the comment and retrieves the resulting vote record. The retrieval ensures correct authorization, data integrity, and accurate references to the target comment, the voting member, and the vote direction.
 *
 * Special attention is given to verifying that the vote direction is correctly stored and returned as 'upvote', and that foreign key relationships to the comment and member are maintained accurately. Timestamps for vote creation are also validated to ensure they conform to the expected date-time format.
 *
 * 1. Authenticated member joins the platform to establish credentials and session tokens.
 * 2. Member creates a new community to serve as the target space for content creation.
 * 3. Member subscribes to the newly created community to unlock posting and commenting capabilities.
 * 4. Member creates a post within the subscribed community to provide a target for comments.
 * 5. Member creates a comment on the post to provide a target for voting.
 * 6. Member casts an upvote on the comment to generate the vote record.
 * 7. Member retrieves the specific comment vote record using its unique identifier.
 * 8. Validates the retrieved vote record matches the expected direction, references the correct comment and member IDs, and includes a valid creation timestamp.
 */
export async function test_api_comment_vote_retrieval(
  connection: api.IConnection,
) {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription);
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: { community_id: community.id },
    },
  );
  typia.assert(post);
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  const vote = await generate_random_reddit_like_community_member_comment_votes_create(
    memberConnection,
    {
      body: { comment_id: comment.id, direction: "upvote" },
    },
  );
  typia.assert(vote);
  const retrievedVote =
    await api.functional.redditLikeCommunity.comment_votes.at(
      memberConnection,
      {
        commentVoteId: vote.id,
      },
    );
  typia.assert(retrievedVote);
  TestValidator.equals(
    "vote direction matches",
    retrievedVote.direction,
    "upvote",
  );
  TestValidator.equals(
    "comment ID matches",
    retrievedVote.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "member ID matches",
    retrievedVote.member.id,
    subscription.member.id,
  );
}