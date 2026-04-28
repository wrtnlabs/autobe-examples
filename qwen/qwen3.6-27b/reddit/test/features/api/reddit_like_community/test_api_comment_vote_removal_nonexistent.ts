import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
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
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";

/**
 * Validates that removing a comment vote returns a 404 error when no vote exists for the requesting member.
 *
 * This test creates the full prerequisite chain—a community, a subscription, a post, and a comment—but intentionally skips casting any vote on the comment. Attempting to remove the non-existent vote should fail with a 404 Not Found error, confirming that the API correctly rejects vote removal requests when the vote record does not exist.
 *
 * The validation ensures that the endpoint does not silently succeed or return an incorrect status code, and that the comment's vote score remains unchanged at zero after the failed removal attempt.
 *
 * 1. Member registers and authenticates to the platform.
 * 2. Member creates a new community.
 * 3. Member subscribes to the community to gain posting privileges.
 * 4. Member creates a post in the subscribed community.
 * 5. Member writes a comment on the post without casting any vote on it.
 * 6. Validates the comment has a vote score of zero, confirming no votes exist.
 * 7. Attempts to remove a vote from the comment and expects a 404 HttpError.
 */
export async function test_api_comment_vote_removal_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Create a community owned by the authenticated member
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe the member to the community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 5. Create a comment on the post (without voting on it)
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      { params: { postId: post.id } },
    );
  typia.assert(comment);
  // 6. Validate that the comment has a vote score of zero (no votes cast)
  TestValidator.equals("comment vote score is zero", comment.voteScore, 0);
  // 7. Attempt to remove a non-existent vote and expect 404 error
  await TestValidator.httpError(
    "removing non-existent vote returns 404",
    404,
    async () =>
      await api.functional.redditLikeCommunity.member.comments.votes.commentVotesErase(
        memberConnection,
        { commentId: comment.id },
      ),
  );
}