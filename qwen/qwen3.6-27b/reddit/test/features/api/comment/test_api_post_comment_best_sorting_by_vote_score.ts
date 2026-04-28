import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityComment";
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
 * Test comment listing sorted by 'best' which orders by vote_score (highest first).
 *
 * Validates that the comment retrieval endpoint correctly sorts comments by their vote score in descending order when the 'best' sort option is used. Creates multiple comments with varying vote scores through upvotes and downvotes from a second member, then verifies the sorting order.
 *
 * The test ensures that upvoted comments (positive vote_score) appear before downvoted comments (negative vote_score), and that the vote_score field accurately reflects the aggregation of votes cast by members.
 *
 * 1. Member A registers and creates a community.
 * 2. Member A subscribes to the community and creates a post.
 * 3. Member A creates three comments on the post.
 * 4. Member B registers and votes on the comments: upvotes comment 1, upvotes comment 2, downvotes comment 3.
 * 5. Member A retrieves comments sorted by 'best'.
 * 6. Verifies that upvoted comments appear before the downvoted comment in the result.
 */
export async function test_api_post_comment_best_sorting_by_vote_score(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers and creates community
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
    } satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  typia.assert(memberAAuthorized);
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 2. Member A subscribes to community and creates a post
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
      } satisfies DeepPartial<IRedditLikeCommunityCommunitySubscription.ICreate>,
    },
  );
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies DeepPartial<IREdditLikeCommunityPost.ICreate>,
    },
  );
  typia.assert(post);
  // 3. Member A creates three comments on the post
  const comment1 =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberAConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunityPostComment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(comment1);
  const comment2 =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberAConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IRedditLikeCommunityPostComment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(comment2);
  const comment3 =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberAConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeCommunityPostComment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(comment3);
  // 4. Member B registers and votes on comments
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      username: RandomGenerator.name(1),
    } satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  // Upvote comment 1
  const upvoteComment1 =
    await api.functional.redditLikeCommunity.member.votes.comments.upvote(
      memberBConnection,
      {
        commentId: comment1.id,
      },
    );
  typia.assert(upvoteComment1);
  // Upvote comment 2
  const upvoteComment2 =
    await api.functional.redditLikeCommunity.member.votes.comments.upvote(
      memberBConnection,
      {
        commentId: comment2.id,
      },
    );
  typia.assert(upvoteComment2);
  // Downvote comment 3
  const downvoteComment3 =
    await api.functional.redditLikeCommunity.member.votes.comments.downvote.downvoteComment(
      memberBConnection,
      {
        commentId: comment3.id,
      },
    );
  typia.assert(downvoteComment3);
  // 5. Retrieve comments sorted by 'best'
  const commentsResponse =
    await api.functional.redditLikeCommunity.member.posts.comments.index(
      memberAConnection,
      {
        postId: post.id,
        body: {
          sort: "best",
        } satisfies IREdditLikeCommunityComment.IRequest,
      },
    );
  typia.assert(commentsResponse);
  // 6. Verify sorting order: upvoted comments should appear before downvoted
  const comments = commentsResponse.data;
  TestValidator.predicate("has at least 3 comments", comments.length >= 3);
  // Extract the comment IDs from the response and verify order
  const comment1Index = comments.findIndex((c) => c.id === comment1.id);
  const comment2Index = comments.findIndex((c) => c.id === comment2.id);
  const comment3Index = comments.findIndex((c) => c.id === comment3.id);
  TestValidator.predicate(
    "comment 1 (upvoted) exists in response",
    comment1Index !== -1,
  );
  TestValidator.predicate(
    "comment 2 (upvoted) exists in response",
    comment2Index !== -1,
  );
  TestValidator.predicate(
    "comment 3 (downvoted) exists in response",
    comment3Index !== -1,
  );
  // Upvoted comments (score +1) should appear before downvoted comment (score -1)
  TestValidator.predicate(
    "upvoted comment 1 appears before downvoted comment 3",
    comment1Index < comment3Index,
  );
  TestValidator.predicate(
    "upvoted comment 2 appears before downvoted comment 3",
    comment2Index < comment3Index,
  );
  // Check vote_scores
  const comment1Data = comments[comment1Index]!;
  const comment2Data = comments[comment2Index]!;
  const comment3Data = comments[comment3Index]!;
  TestValidator.equals(
    "comment 1 has vote_score of 1",
    comment1Data.vote_score,
    1,
  );
  TestValidator.equals(
    "comment 2 has vote_score of 1",
    comment2Data.vote_score,
    1,
  );
  TestValidator.equals(
    "comment 3 has vote_score of -1",
    comment3Data.vote_score,
    -1,
  );
}
