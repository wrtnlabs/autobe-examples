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
import { generate_random_reddit_like_community_member_comments_votes_create } from "../../../generate/generate_random_reddit_like_community_member_comments_votes_create";
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
 * Test cross-user comment voting with karma impact validation.
 *
 * Validates that when a voter member casts an upvote on a comment authored by a different member, the vote is correctly attributed to the voter and the comment's vote score increases. Verifies proper identity tracking across both users in the vote record, ensuring the member field references the voter and the comment's author field references the original author.
 *
 * 1. Author member registers and creates community infrastructure (community, subscription, post, comment).
 * 2. Voter member registers as a separate user account.
 * 3. Voter casts an upvote on the author's comment.
 * 4. Validates vote attribution, direction, comment vote_score increment, and cross-user identity tracking.
 */
export async function test_api_comment_vote_karma_impact_cross_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Author member joins
  const authorConnection: api.IConnection = { host: connection.host };
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorJoin = await authorize_member_join(authorConnection, {
    body: { email: authorEmail },
  });
  typia.assert(authorJoin);
  // 2. Author creates community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Author subscribes to their community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      authorConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Author creates a post in the subscribed community
  const post = await generate_random_reddit_like_community_member_posts_create(
    authorConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 5. Author creates a comment on their post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      authorConnection,
      { params: { postId: post.id } },
    );
  typia.assert(comment);
  // 6. Voter member joins (separate user)
  const voterConnection: api.IConnection = { host: connection.host };
  const voterJoin = await authorize_member_join(voterConnection, {
    body: { email: typia.random<string & tags.Format<"email">>() },
  });
  typia.assert(voterJoin);
  // 7. Voter casts upvote on author's comment
  const vote =
    await generate_random_reddit_like_community_member_comments_votes_create(
      voterConnection,
      {
        params: { commentId: comment.id },
        body: { direction: "upvote" },
      },
    );
  typia.assert(vote);
  // 8. Validate vote attribution to voter (not author)
  TestValidator.equals(
    "vote attributed to voter",
    vote.member.id,
    voterJoin.id,
  );
  // 9. Validate comment's author is the original author member
  TestValidator.equals(
    "comment author is original author",
    vote.comment.author.id,
    authorJoin.id,
  );
  // 10. Validate vote direction is upvote
  TestValidator.equals("vote direction is upvote", vote.direction, "upvote");
  // 11. Validate comment vote_score increased by 1 (from 0)
  TestValidator.equals(
    "comment vote_score incremented to 1",
    vote.comment.vote_score,
    1,
  );
  // 12. Validate voter identities differ (cross-user scenario confirmed)
  TestValidator.notEquals(
    "author and voter are different members",
    authorJoin.id,
    voterJoin.id,
  );
}
