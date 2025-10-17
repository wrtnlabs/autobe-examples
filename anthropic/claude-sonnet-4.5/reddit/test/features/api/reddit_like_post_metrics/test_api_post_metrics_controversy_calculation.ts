import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostMetrics";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";

export async function test_api_post_metrics_controversy_calculation(
  connection: api.IConnection,
) {
  // 1. Create first member account
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: firstMemberEmail,
        password: "SecurePass123!",
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(firstMember);

  // 2. Create community for the post
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create post in the community
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // 4. First member upvotes the post
  const upvote: IRedditLikePostVote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: post.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikePostVote.ICreate,
    });
  typia.assert(upvote);

  // 5. Create second member account
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: secondMemberEmail,
        password: "SecurePass456!",
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(secondMember);

  // 6. Second member downvotes the post
  const downvote: IRedditLikePostVote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: post.id,
      body: {
        vote_value: -1,
      } satisfies IRedditLikePostVote.ICreate,
    });
  typia.assert(downvote);

  // 7. Retrieve post metrics and validate controversy calculation
  const metrics: IRedditLikePostMetrics =
    await api.functional.redditLike.posts.metrics.at(connection, {
      postId: post.id,
    });
  typia.assert(metrics);

  // Validate balanced voting metrics
  TestValidator.equals(
    "vote score should be zero with balanced votes",
    metrics.vote_score,
    0,
  );
  TestValidator.equals("upvote count should be one", metrics.upvote_count, 1);
  TestValidator.equals(
    "downvote count should be one",
    metrics.downvote_count,
    1,
  );

  // Calculate and validate upvote percentage (should be approximately 50%)
  const totalVotes = metrics.upvote_count + metrics.downvote_count;
  const upvotePercentage =
    totalVotes > 0 ? (metrics.upvote_count / totalVotes) * 100 : 0;
  TestValidator.predicate(
    "upvote percentage should be approximately 50% for controversial content",
    upvotePercentage >= 49 && upvotePercentage <= 51,
  );
}
