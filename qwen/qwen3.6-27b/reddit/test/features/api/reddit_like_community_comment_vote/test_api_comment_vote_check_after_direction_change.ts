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
 * Test that checking a comment vote reflects the updated direction after the member changes their vote.
 *
 * Validates the complete vote direction change workflow including member authentication, community creation, post creation, comment creation, initial upvote, subsequent downvote (direction change), and vote verification. Ensures that the vote check API correctly returns the current (downvote) direction after the direction change, the created_at timestamp differs from updated_at, and the updated_at reflects the more recent change time.
 *
 * The test verifies core voting functionality where a single vote record gets updated in place with a direction change, preserving the original vote ID and creation timestamp while updating the direction and update timestamp. This confirms no new vote is created when changing direction, and the vote check endpoint returns accurate current state.
 *
 * 1. Member registers with randomized email, password, and username.
 * 2. Create a community with randomized name and description.
 * 3. Subscribe the member to the created community.
 * 4. Create a post in the community with randomized title and content type.
 * 5. Create a comment on the post with randomized body content.
 * 6. Cast an upvote on the comment.
 * 7. Cast a downvote on the same comment (changes vote direction from upvote to downvote).
 * 8. Check the vote using the comment ID.
 * 9. Validate direction is 'downvote' reflecting the current state after the change.
 * 10. Validate that created_at differs from updated_at (updated_at is more recent).
 * 11. Confirm the vote ID remains consistent with the original vote record.
 */
export async function test_api_comment_vote_check_after_direction_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assertGuard(member);
  // 2. Create community
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies Partial<IREdditLikeCommunityCommunity.ICreate>,
      },
    );
  typia.assertGuard(community);
  // 3. Subscribe to community
  const subscription: IRedditLikeCommunityCommunitySubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies Partial<IRedditLikeCommunityCommunitySubscription.ICreate>,
      },
    );
  typia.assertGuard(subscription);
  // 4. Create post in community
  const post: IREdditLikeCommunityPost =
    await generate_random_reddit_like_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          post_type: "text",
          community_id: community.id,
        } satisfies Partial<IREdditLikeCommunityPost.ICreate>,
      },
    );
  typia.assertGuard(post);
  // 5. Create comment on post
  const comment: IRedditLikeCommunityPostComment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies Partial<IRedditLikeCommunityPostComment.ICreate>,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assertGuard(comment);
  // 6. Cast upvote on comment
  const upvoteResponse: IRedditLikeCommunityCommentVote =
    await api.functional.redditLikeCommunity.member.votes.comments.upvote(
      memberConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assertGuard(upvoteResponse);
  const originalVoteId: string = upvoteResponse.id;
  // 7. Cast downvote on same comment (changes vote direction)
  const downvoteResponse: IRedditLikeCommunityCommentVote =
    await api.functional.redditLikeCommunity.member.votes.comments.downvote.downvoteComment(
      memberConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assertGuard(downvoteResponse);
  // 8. Check the vote
  const checkedVote: IRedditLikeCommunityCommentVote =
    await api.functional.redditLikeCommunity.member.votes.comments.check.at(
      memberConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assertGuard(checkedVote);
  // 9. Verify direction is 'downvote' (current state after change)
  TestValidator.equals(
    "direction is downvote after change",
    checkedVote.direction,
    "downvote",
  );
  // 10. Verify created_at differs from updated_at (updated_at is more recent)
  TestValidator.notEquals(
    "created_at differs from updated_at",
    checkedVote.created_at,
    checkedVote.updated_at,
  );
  // 11. Confirm vote ID remains the same (same vote record, just updated)
  TestValidator.equals(
    "vote ID remains consistent",
    originalVoteId,
    checkedVote.id,
  );
}
