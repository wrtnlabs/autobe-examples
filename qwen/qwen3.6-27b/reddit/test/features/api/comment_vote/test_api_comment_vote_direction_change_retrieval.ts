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
 * Test comment vote direction change and retrieval workflow.
 *
 * Validates the complete vote lifecycle where a registered member creates a community, subscribes to gain posting privileges, creates a post, writes a comment on the post, and then performs vote operations. The member first casts an upvote on the comment, then changes it to a downvote. Using the vote's unique identifier, the member retrieves the vote record to confirm the updated direction and timestamp reflect the modification.
 *
 * 1. Register a new member account and authenticate.
 * 2. Create a community as the authenticated member.
 * 3. Subscribe to the community to gain posting privileges.
 * 4. Create a post in the subscribed community.
 * 5. Write a comment on the post.
 * 6. Cast an initial upvote on the comment.
 * 7. Change the vote direction to downvote.
 * 8. Retrieve the vote record using its unique identifier.
 * 9. Validate that the vote direction is now 'downvote' and the updated_at timestamp reflects the recent modification.
 */
export async function test_api_comment_vote_direction_change_retrieval(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a community as the authenticated member
  const community =
    await api.functional.redditLikeCommunity.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community to gain posting privileges
  const subscription =
    await api.functional.redditLikeCommunity.member.community_subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the subscribed community
  const post = await api.functional.redditLikeCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IREdditLikeCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Write a comment on the post
  const comment =
    await api.functional.redditLikeCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunityPostComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Cast an initial upvote on the comment
  const initialVote =
    await api.functional.redditLikeCommunity.member.comment_votes.create(
      memberConnection,
      {
        body: {
          comment_id: comment.id,
          direction: "upvote",
        } satisfies IRedditLikeCommunityCommentVote.ICreate,
      },
    );
  typia.assert(initialVote);
  // 7. Change the vote direction to downvote (update existing vote)
  const updatedVote =
    await api.functional.redditLikeCommunity.member.comment_votes.create(
      memberConnection,
      {
        body: {
          comment_id: comment.id,
          direction: "downvote",
        } satisfies IRedditLikeCommunityCommentVote.ICreate,
      },
    );
  typia.assert(updatedVote);
  // 8. Retrieve the vote record using its unique identifier
  const retrievedVote =
    await api.functional.redditLikeCommunity.comment_votes.at(
      memberConnection,
      {
        commentVoteId: updatedVote.id,
      },
    );
  typia.assert(retrievedVote);
  // 9. Validate that the vote direction is now 'downvote'
  TestValidator.equals(
    "vote direction is downvote",
    retrievedVote.direction,
    "downvote",
  );
  TestValidator.predicate(
    "vote has updated_at timestamp",
    retrievedVote.updated_at !== null && retrievedVote.updated_at !== undefined,
  );
}
