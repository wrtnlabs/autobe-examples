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
 * Test comment downvote cross-user karma impact validation.
 *
 * Validates that downvoting a comment correctly impacts the comment author's karma score while leaving the voter's karma unchanged. Member1 creates a community, subscribes, publishes a post, and writes a comment. Member2 subscribes to the same community and downvotes Member1's comment. After the downvote, both members re-authenticate to capture updated karma values.
 *
 * The test verifies the returned vote record shows direction "downvote", identifies the correct voter and comment, and confirms the comment's vote_score decreased. Critically, it validates that Member1's (comment author's) karma decreased by 1 point while Member2's (voter's) karma remained unchanged, proving karma impact flows to content creators only.
 *
 * 1. Member1 authenticates with known password, captures initial karma.
 * 2. Member1 creates a community and subscribes to it.
 * 3. Member1 creates a post and writes a comment, capturing initial vote score.
 * 4. Member2 authenticates with known password, captures initial karma.
 * 5. Member2 subscribes to the same community.
 * 6. Member2 downvotes Member1's comment.
 * 7. Both members re-authenticate to capture post-downvote karma.
 * 8. Validates vote record structure, comment score change, and karma impact.
 */
export async function test_api_comment_downvote_cross_user_karma_impact(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate Member1 and capture initial karma
  const member1Password = RandomGenerator.alphaNumeric(16);
  const member1Conn: api.IConnection = { host: connection.host };
  const member1Authorized = await authorize_member_join(member1Conn, {
    body: {
      password: member1Password,
    },
  });
  typia.assert(member1Authorized);
  const initialKarma1 = member1Authorized.karma;
  // 2. Member1 creates community and subscribes
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      member1Conn,
      {},
    );
  typia.assert(community);
  const member1Subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      member1Conn,
      { body: { community_id: community.id } },
    );
  typia.assert(member1Subscription);
  // 3. Member1 creates post and comment, capturing initial vote score
  const post = await generate_random_reddit_like_community_member_posts_create(
    member1Conn,
    { body: { community_id: community.id, post_type: "text" } },
  );
  typia.assert(post);
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      member1Conn,
      { params: { postId: post.id } },
    );
  typia.assert(comment);
  const initialCommentVoteScore = comment.voteScore;
  // 4. Authenticate Member2 and capture initial karma
  const member2Password = RandomGenerator.alphaNumeric(16);
  const member2Conn: api.IConnection = { host: connection.host };
  const member2Authorized = await authorize_member_join(member2Conn, {
    body: {
      password: member2Password,
    },
  });
  typia.assert(member2Authorized);
  const initialKarma2 = member2Authorized.karma;
  // 5. Member2 subscribes to the same community
  const member2Subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      member2Conn,
      { body: { community_id: community.id } },
    );
  typia.assert(member2Subscription);
  // 6. Member2 downvotes Member1's comment
  const voteRecord =
    await api.functional.redditLikeCommunity.member.votes.comments.downvote.downvoteComment(
      member2Conn,
      {
        commentId: comment.id,
      },
    );
  typia.assert(voteRecord);
  // 7. Re-authenticate both members to capture post-downvote karma
  const member1LoginConn: api.IConnection = { host: connection.host };
  const member1UpdatedAuthorized = await authorize_member_login(
    member1LoginConn,
    {
      body: {
        email: member1Authorized.email,
        password: member1Password,
      },
    },
  );
  typia.assert(member1UpdatedAuthorized);
  const member2LoginConn: api.IConnection = { host: connection.host };
  const member2UpdatedAuthorized = await authorize_member_login(
    member2LoginConn,
    {
      body: {
        email: member2Authorized.email,
        password: member2Password,
      },
    },
  );
  typia.assert(member2UpdatedAuthorized);
  // 8. Validate vote record and karma changes
  // Vote record structure validation
  TestValidator.equals(
    "vote direction is downvote",
    voteRecord.direction,
    "downvote",
  );
  TestValidator.equals(
    "voter is member2",
    voteRecord.member.id,
    member2Authorized.id,
  );
  TestValidator.equals(
    "comment id matches target",
    voteRecord.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment vote score decreased by 1",
    voteRecord.comment.vote_score,
    initialCommentVoteScore - 1,
  );
  // Critical karma cross-user validation
  TestValidator.equals(
    "member1 (comment author) karma decreased by 1",
    member1UpdatedAuthorized.karma,
    initialKarma1 - 1,
  );
  TestValidator.equals(
    "member2 (voter) karma unchanged",
    member2UpdatedAuthorized.karma,
    initialKarma2,
  );
}
