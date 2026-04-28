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
 * Test erasure of a downvote cast on a comment, verifying correct score recalculation.
 *
 * Validates the complete workflow of a member casting a downvote on a comment and then erasing it. Ensures that the vote record is properly deleted and the comment's aggregate vote score correctly increases by 1 (removing the negative contribution of the downvote). Confirms bidirectional score recalculation works symmetrically for both downvote creation and erasure.
 *
 * Special attention is given to verifying that the vote score recovers exactly by +1 after downvote erasure, demonstrating that the system correctly reverses the impact of a removed negative vote.
 *
 * 1. Member joins the platform.
 * 2. Member creates a community and subscribes to it.
 * 3. Member creates a post in the subscribed community.
 * 4. Member creates a comment on the post.
 * 5. Captures the comment's initial vote score.
 * 6. Member casts a downvote on the comment.
 * 7. Verifies that the comment's vote score decreased by 1.
 * 8. Member erases the downvote using the vote record ID.
 * 9. Verifies that the comment's vote score increased back by 1 (recovered to initial).
 */
export async function test_api_comment_vote_erase_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the platform
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      password: "1234",
    },
  });
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  // 4. Create a post in the community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 5. Create a comment on the post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      { params: { postId: post.id }, body: {} },
    );
  typia.assert(comment);
  // 6. Capture initial vote score before any vote
  const initialVoteScore = comment.voteScore;
  // 7. Cast a downvote on the comment
  const downvote =
    await generate_random_reddit_like_community_member_comment_votes_create(
      memberConnection,
      { body: { comment_id: comment.id, direction: "downvote" } },
    );
  typia.assert(downvote);
  TestValidator.equals(
    "downvote direction is downvote",
    downvote.direction,
    "downvote",
  );
  TestValidator.equals(
    "downvote comment matches",
    downvote.comment.id,
    comment.id,
  );
  // Verify vote score decreased by 1 after downvote
  TestValidator.equals(
    "comment vote score decreased by 1 after downvote",
    downvote.comment.vote_score,
    initialVoteScore - 1,
  );
  // 8. Erase the downvote
  await api.functional.redditLikeCommunity.member.comment_votes.erase(
    memberConnection,
    {
      commentVoteId: downvote.id,
    },
  );
  // 9. Re-cast the downvote to verify score recovery
  // If erasure worked correctly, the comment's vote score should have returned
  // to initialVoteScore. A fresh downvote should decrease it by 1 again.
  const secondDownvote =
    await generate_random_reddit_like_community_member_comment_votes_create(
      memberConnection,
      { body: { comment_id: comment.id, direction: "downvote" } },
    );
  typia.assert(secondDownvote);
  // The score should be initialVoteScore - 1, confirming the first downvote was properly erased
  TestValidator.equals(
    "comment vote score is initialScore - 1 after re-downvote (confirms erasure)",
    secondDownvote.comment.vote_score,
    initialVoteScore - 1,
  );
}
