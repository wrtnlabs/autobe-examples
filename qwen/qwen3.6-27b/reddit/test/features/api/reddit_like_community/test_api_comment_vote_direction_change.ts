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
 * Test updating a comment vote direction from upvote to downvote.
 *
 * Validates the vote direction change workflow: member A creates a community, subscribes,
 * creates a post and comment, casts an initial upvote, then updates the vote
 * direction to downvote. Verifies the response reflects the new direction, ensures
 * the updated_at timestamp reflects the modification time while created_at remains
 * unchanged, and confirms only one vote record exists.
 *
 * 1. Member A registers and authenticates
 * 2. Member A creates a community
 * 3. Member A subscribes to the community
 * 4. Member A creates a post in the community
 * 5. Member A creates a comment on the post
 * 6. Member A casts an upvote on the comment
 * 7. Member A updates the vote from upvote to downvote
 * 8. Validate the updated vote reflects downvote direction
 * 9. Validate timestamps (updated_at changed, created_at unchanged)
 */
export async function test_api_comment_vote_direction_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Member A creates a community
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to the community
  const subscription: IRedditLikeCommunityCommunitySubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Member A creates a post in the community
  const post: IREdditLikeCommunityPost =
    await generate_random_reddit_like_community_member_posts_create(
      memberConnection,
      {},
    );
  typia.assert(post);
  // 5. Member A creates a comment on the post
  const comment: IRedditLikeCommunityPostComment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeCommunityPostComment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 6. Member A casts an upvote on the comment
  const vote: IRedditLikeCommunityCommentVote =
    await generate_random_reddit_like_community_member_comment_votes_create(
      memberConnection,
      {
        body: {
          comment_id: comment.id,
          direction: "upvote",
        } satisfies IRedditLikeCommunityCommentVote.ICreate,
      },
    );
  typia.assert(vote);
  // Store the original created_at
  const originalCreatedAt: string & tags.Format<"date-time"> = vote.created_at;
  // 7. Member A updates the vote from upvote to downvote
  const updatedVote: IRedditLikeCommunityCommentVote =
    await api.functional.redditLikeCommunity.member.comment_votes.update(
      memberConnection,
      {
        commentVoteId: vote.id,
        body: {
          direction: "downvote",
        } satisfies IRedditLikeCommunityCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // 8. Validate the updated vote reflects downvote direction
  TestValidator.equals(
    "vote direction is downvote",
    updatedVote.direction,
    "downvote",
  );
  // 9. Validate timestamps (updated_at changed, created_at unchanged)
  TestValidator.equals(
    "created_at remains unchanged",
    updatedVote.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at reflects modification",
    updatedVote.updated_at,
    originalCreatedAt,
  );
}
