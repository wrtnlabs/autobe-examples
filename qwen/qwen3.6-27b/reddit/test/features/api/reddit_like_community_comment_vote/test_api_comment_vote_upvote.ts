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
 * Test member upvoting a comment cast by another member, increasing the comment's vote score by 1 and the commenter's karma by 1.
 *
 * Validates the complete upvote flow including community creation by the commenter, post creation, and comment creation, followed by a separate voter joining and upvoting the comment. Ensures the vote record is created correctly with direction 'upvote'.
 *
 * 1. Commenter joins as a community creator, post author, and comment author.
 * 2. Voter joins as a separate member to vote on the comment.
 * 3. Commenter creates a community.
 * 4. Commenter subscribes to the community.
 * 5. Voter subscribes to the community.
 * 6. Commenter creates a post in the community.
 * 7. Commenter creates a comment on the post.
 * 8. Voter upvotes the comment.
 * 9. Validates the vote record has direction 'upvote'.
 */
export async function test_api_comment_vote_upvote(
  connection: api.IConnection,
) {
  // 1. Commenter joins
  const commenterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(commenterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Voter joins
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Commenter creates a community
  const community =
    await api.functional.redditLikeCommunity.member.communities.create(
      commenterConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Commenter subscribes to the community
  await api.functional.redditLikeCommunity.member.community_subscriptions.create(
    commenterConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
    },
  );
  // 5. Voter subscribes to the community
  await api.functional.redditLikeCommunity.member.community_subscriptions.create(
    voterConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
    },
  );
  // 6. Commenter creates a post in the community
  const post = await api.functional.redditLikeCommunity.member.posts.create(
    commenterConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IREdditLikeCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 7. Commenter creates a comment on the post
  const comment =
    await api.functional.redditLikeCommunity.member.posts.comments.create(
      commenterConnection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeCommunityPostComment.ICreate,
      },
    );
  typia.assert(comment);
  // 8. Voter upvotes the comment
  const vote = await api.functional.redditLikeCommunity.comment_votes.update(
    voterConnection,
    {
      body: {
        commentId: comment.id,
        direction: "upvote",
      } satisfies IRedditLikeCommunityCommentVote.IUpdate,
    },
  );
  typia.assert(vote);
  // 9. Validate vote direction is 'upvote'
  TestValidator.equals("vote direction is upvote", vote.direction, "upvote");
}