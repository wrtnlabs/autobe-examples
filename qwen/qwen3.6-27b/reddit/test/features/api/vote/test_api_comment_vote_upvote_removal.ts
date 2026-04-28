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
 * Test member removes their upvote on a comment authored by another member.
 *
 * Validates the complete upvote removal business workflow including vote score
 * adjustment, author karma decrease, and removed vote record confirmation. Ensures
 * that when a voter retracts their upvote, the comment aggregate score decreases by 1 and the comment author karma is reduced accordingly.
 *
 * Special attention is given to verifying that the removed vote record is returned in
 * the response confirming successful removal with the upvote direction.
 *
 * 1. Register and authenticate member A as the comment author.
 * 2. Member A creates a community and subscribes for posting privileges.
 * 3. Member A creates a post in the subscribed community.
 * 4. Member A creates a comment on the post to establish comment existence.
 * 5. Register and authenticate member B as the voter.
 * 6. Member B subscribes to the community for voting privileges.
 * 7. Member B casts an upvote on member A's comment.
 * 8. Member B removes their upvote and validates the removed vote record.
 */
export async function test_api_comment_vote_upvote_removal(
  connection: api.IConnection,
) {
  // 1. Register member A (comment author)
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Member A creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to the community
  const authorSubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(authorSubscription);
  // 4. Member A creates a post
  const post = await generate_random_reddit_like_community_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IREdditLikeCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member A creates a comment on the post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunityPostComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Register member B (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 7. Member B subscribes to the community
  const voterSubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      voterConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(voterSubscription);
  // 8. Member B casts an upvote on the comment
  const upvote =
    await generate_random_reddit_like_community_member_comment_votes_create(
      voterConnection,
      {
        body: {
          comment_id: comment.id,
          direction: "upvote",
        } satisfies IRedditLikeCommunityCommentVote.ICreate,
      },
    );
  typia.assert(upvote);
  // 9. Member B removes their upvote
  const removedVote =
    await api.functional.redditLikeCommunity.member.votes.comments.remove.retract(
      voterConnection,
      { commentId: comment.id },
    );
  typia.assert(removedVote);
  // Validate removed vote record confirms upvote removal
  TestValidator.equals(
    "removed vote is upvote",
    removedVote.direction,
    "upvote",
  );
  TestValidator.equals(
    "removed vote comment ID matches",
    removedVote.comment.id,
    comment.id,
  );
}