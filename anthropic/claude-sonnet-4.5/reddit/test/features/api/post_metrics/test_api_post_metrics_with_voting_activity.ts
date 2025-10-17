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

/**
 * Test that post metrics accurately reflect voting activity.
 *
 * This test validates the complete workflow of member registration, community
 * creation, post creation, vote casting, and metrics retrieval. It ensures that
 * the materialized view correctly aggregates voting data by verifying:
 *
 * - Vote_score equals 1 (one upvote, zero downvotes)
 * - Upvote_count equals 1
 * - Downvote_count equals 0
 * - Upvote percentage equals 100%
 *
 * Workflow:
 *
 * 1. Register a new member account
 * 2. Create a community for posting
 * 3. Create a text post in the community
 * 4. Cast an upvote on the post
 * 5. Retrieve post metrics
 * 6. Validate all metrics match expected values
 */
export async function test_api_post_metrics_with_voting_activity(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create a community for the post
  const communityData = {
    code: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<25> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a text post in the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Cast an upvote on the post
  const voteData = {
    vote_value: 1,
  } satisfies IRedditLikePostVote.ICreate;

  const vote: IRedditLikePostVote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: post.id,
      body: voteData,
    });
  typia.assert(vote);

  // Step 5: Retrieve post metrics from the materialized view
  const metrics: IRedditLikePostMetrics =
    await api.functional.redditLike.posts.metrics.at(connection, {
      postId: post.id,
    });
  typia.assert(metrics);

  // Step 6: Validate all metrics match expected values
  TestValidator.equals("vote_score should be 1", metrics.vote_score, 1);
  TestValidator.equals("upvote_count should be 1", metrics.upvote_count, 1);
  TestValidator.equals("downvote_count should be 0", metrics.downvote_count, 0);

  // Calculate and validate upvote percentage (should be 100% with 1 upvote and 0 downvotes)
  const totalVotes = metrics.upvote_count + metrics.downvote_count;
  const upvotePercentage =
    totalVotes > 0 ? (metrics.upvote_count / totalVotes) * 100 : 0;
  TestValidator.equals(
    "upvote percentage should be 100%",
    upvotePercentage,
    100,
  );
}
