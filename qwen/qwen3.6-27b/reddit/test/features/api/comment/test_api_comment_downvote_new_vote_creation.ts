import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IRedditLikeCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentVote";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import { type IConnection } from "@nestia/fetcher";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";

/**
 * Test primary downvote workflow when a member casts their first downvote on a comment.
 *
 * Validates the complete downvote creation flow including member authentication, community setup, post creation, and comment publication. Tests the core downvote creation business rule where no previous vote exists for this member-comment pair, and verifies that the vote record, comment score, and author karma are all correctly updated.
 *
 * Special attention is given to verifying the author's karma decrease and the comment vote score change, ensuring the downvote operation correctly impacts both the target comment and its author simultaneously.
 *
 * 1. Member registers and authenticates to the platform.
 * 2. Community is created for publishing content.
 * 3. Member subscribes to the community as prerequisite for content creation.
 * 4. Post is created within the subscribed community.
 * 5. Comment is created on the post.
 * 6. Pre-downvote author karma is captured for comparison.
 * 7. Member downvotes the comment via the target endpoint.
 * 8. Validates vote direction is "downvote", created_at and updated_at timestamps are set, comment vote_score is -1 (down from 0), and author karma decreased by 1 point.
 */
export async function test_api_comment_downvote_new_vote_creation(
  connection: IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(member);
  // 2. Create community
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription: IRedditLikeCommunityCommunitySubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Create post in community
  const post: IREdditLikeCommunityPost =
    await generate_random_reddit_like_community_member_posts_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(post);
  // 5. Create comment on post
  const comment: IRedditLikeCommunityPostComment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { body: RandomGenerator.paragraph({ sentences: 3 }) },
      },
    );
  typia.assert(comment);
  // 6. Capture baseline karma from author before downvote
  const karmaBefore: number & tags.Type<"int32"> =
    ((comment.author as any).karma ?? 0) satisfies number as number;
  // 7. Downvote the comment
  const vote: IRedditLikeCommunityCommentVote =
    await api.functional.redditLikeCommunity.member.votes.comments.downvote.downvoteComment(
      memberConnection,
      { commentId: comment.id },
    );
  typia.assert(vote);
  // 8. Validate downvote record and business logic effects
  TestValidator.equals("vote direction", vote.direction, "downvote");
  TestValidator.predicate(
    "created_at timestamp set",
    vote.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp set",
    vote.updated_at.length > 0,
  );
  TestValidator.equals(
    "comment score decreased by 1 from baseline",
    vote.comment.vote_score,
    -1,
  );
  TestValidator.equals(
    "author karma decreased by 1",
    (vote.comment.author as any).karma,
    karmaBefore - 1,
  );
}