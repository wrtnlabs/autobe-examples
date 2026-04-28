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
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";

/**
 * Test comment upvote idempotency when voting twice on an already upvoted comment.
 *
 * Validates that the upvote endpoint behaves idempotently when a member who has already upvoted a comment attempts to upvote again. The endpoint should return the existing vote record unchanged without creating duplicates or incrementing scores.
 *
 * Verifies that the returned vote record has the same id and created_at timestamp on both calls, that the comment's vote_score remains +1 (not incremented to +2), and that no duplicate vote records are created.
 *
 * 1. Commenter member joins, creates community, subscribes, creates post and comment.
 * 2. Voter member joins on a separate actor connection.
 * 3. Voter upvotes the comment for the first time, recording vote id, created_at, comment vote_score.
 * 4. Voter calls the same upvote endpoint again on the same comment.
 * 5. Verify returned vote id matches the first upvote (no duplicate vote created).
 * 6. Verify vote direction is 'upvote' and created_at timestamp is unchanged.
 * 7. Verify comment vote_score remains +1 (not incremented).
 */
export async function test_api_comment_upvote_idempotent_already_upvoted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Commenter member setup
  const commenterConnection: api.IConnection = { host: connection.host };
  const commenter = await authorize_member_join(commenterConnection, {
    body: {},
  });
  typia.assert(commenter);
  // 2. Create community as commenter
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      commenterConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe to community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    commenterConnection,
    { body: { community_id: community.id } },
  );
  // 4. Create post in community
  const post = await generate_random_reddit_like_community_member_posts_create(
    commenterConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create comment on the post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      commenterConnection,
      {
        params: { postId: post.id },
        body: { body: RandomGenerator.paragraph({ sentences: 2 }) },
      },
    );
  typia.assert(comment);
  // 6. Voter member setup (separate actor connection)
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, { body: {} });
  // 7. First upvote
  const firstVote =
    await api.functional.redditLikeCommunity.member.votes.comments.upvote(
      voterConnection,
      { commentId: comment.id },
    );
  typia.assert(firstVote);
  // Record first vote state
  const originalVoteId = firstVote.id;
  const originalCreatedAt = firstVote.created_at;
  const originalVoteScore = firstVote.comment.vote_score;
  // 8. Second upvote on same comment
  const secondVote =
    await api.functional.redditLikeCommunity.member.votes.comments.upvote(
      voterConnection,
      { commentId: comment.id },
    );
  typia.assert(secondVote);
  // 9. Validate idempotency - same vote record returned
  TestValidator.equals(
    "vote ID unchanged (no duplicate)",
    originalVoteId,
    secondVote.id,
  );
  // 10. Validate vote direction
  TestValidator.equals(
    "vote direction is upvote",
    "upvote",
    secondVote.direction,
  );
  // 11. Validate created_at did NOT change
  TestValidator.equals(
    "vote created_at unchanged",
    originalCreatedAt,
    secondVote.created_at,
  );
  // 12. Validate comment vote_score did NOT increase (still +1)
  TestValidator.equals(
    "comment vote_score unchanged after second upvote",
    originalVoteScore,
    secondVote.comment.vote_score,
  );
  TestValidator.predicate("comment vote_score is +1", originalVoteScore === 1);
}
