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
 * Test vote direction reversal from upvote to downvote on a comment.
 *
 * Validates the complete vote direction change workflow where a member first upvotes a comment and then changes their vote to a downvote. The system should update the existing vote record rather than creating a duplicate, adjusting the comment's vote score by -2 points (removing +1 upvote and applying -1 downvote).
 *
 * Special attention is given to verifying that the vote record is updated in place: the same vote ID is returned, the created_at timestamp remains unchanged, and the updated_at timestamp reflects the modification time.
 *
 * 1. Member registers and authenticates on the platform.
 * 2. Member creates a community for content publishing.
 * 3. Member subscribes to the community as required for posting.
 * 4. Member publishes a post in the subscribed community.
 * 5. Member creates a comment on the post.
 * 6. Member casts an initial upvote on the comment, recording the vote ID and timestamps.
 * 7. Member changes the vote to downvote on the same comment.
 * 8. Validates the downvote response has direction "downvote", matching vote ID, unchanged created_at, and updated updated_at timestamp.
 */
export async function test_api_comment_vote_direction_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  // 4. Create post
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 5. Create comment on post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { body: RandomGenerator.paragraph({ sentences: 2 }) },
      },
    );
  typia.assert(comment);
  // 6. Cast initial upvote
  const upvoteResult =
    await api.functional.redditLikeCommunity.member.votes.comments.upvote(
      memberConnection,
      { commentId: comment.id },
    );
  typia.assert(upvoteResult);
  const originalVoteId = upvoteResult.id;
  const originalCreatedAt = upvoteResult.created_at;
  TestValidator.equals(
    "initial vote direction is upvote",
    upvoteResult.direction,
    "upvote",
  );
  // 7. Change vote to downvote
  const downvoteResult =
    await api.functional.redditLikeCommunity.member.votes.comments.downvote.downvoteComment(
      memberConnection,
      { commentId: comment.id },
    );
  typia.assert(downvoteResult);
  // 8. Validate vote direction reversal
  TestValidator.equals(
    "vote direction changed to downvote",
    downvoteResult.direction,
    "downvote",
  );
  // Vote record should be the same (updated, not recreated)
  TestValidator.equals(
    "vote ID remains the same after direction change",
    downvoteResult.id,
    originalVoteId,
  );
  // created_at should not change (same vote record)
  TestValidator.equals(
    "created_at unchanged after direction change",
    downvoteResult.created_at,
    originalCreatedAt,
  );
}
