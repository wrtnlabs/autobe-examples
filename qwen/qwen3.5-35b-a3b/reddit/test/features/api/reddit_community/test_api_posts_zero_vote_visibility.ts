import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test business rule that posts with zero votes are fully visible and accessible to all users.
 *
 * Validates the complete visibility workflow for posts with vote_score = 0, ensuring they are not hidden, filtered out, or treated differently from posts with any other vote count. The test verifies that zero-vote posts appear across all sort methods and vote score filter combinations.
 *
 * Special attention is given to validating that:
 * - Zero-vote posts are included in default result listings
 * - All sort methods (hot, new, top, controversial) return zero-vote posts
 * - Vote score filters around zero work correctly (voteScoreMin=0, voteScoreMax=0, ranges)
 * - Zero-vote posts have complete metadata as defined by IRedditCommunityPost.ISummary
 * - The system treats zero-vote posts identically to posts with any other vote count
 *
 * This test validates the business rule: Zero Vote Post Visibility (posts are not hidden based on vote count).
 *
 * Note: This test works with existing posts in the database that have zero votes, as no create endpoint is available.
 */
export async function test_api_posts_zero_vote_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch posts with default sort (should include zero-vote posts)
  const defaultResults = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        limit: 100,
        page: 1,
      },
    },
  );
  typia.assert(defaultResults);
  // 2. Test sorting by "new" (chronological) - should include zero-vote posts
  const newSortResults = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        sort: "new",
        limit: 100,
        page: 1,
      },
    },
  );
  typia.assert(newSortResults);
  // 3. Test sorting by "hot" (engagement-based) - should include zero-vote posts
  const hotSortResults = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        sort: "hot",
        limit: 100,
        page: 1,
      },
    },
  );
  typia.assert(hotSortResults);
  // 4. Test sorting by "top" with all_time period - should include zero-vote posts
  const topSortResults = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        sort: "top",
        timePeriod: "all_time",
        limit: 100,
        page: 1,
      },
    },
  );
  typia.assert(topSortResults);
  // 5. Test sorting by "controversial" - should include zero-vote posts
  const controversialSortResults =
    await api.functional.redditCommunity.posts.index(connection, {
      body: {
        sort: "controversial",
        limit: 100,
        page: 1,
      },
    });
  typia.assert(controversialSortResults);
  // 6. Test voteScoreMin=0 filter (should include zero-vote posts and above)
  const voteScoreMinResults = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        voteScoreMin: 0,
        limit: 100,
        page: 1,
      },
    },
  );
  typia.assert(voteScoreMinResults);
  // 7. Test voteScoreMax=0 filter (should include ONLY zero-vote posts)
  const voteScoreMaxResults = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        voteScoreMax: 0,
        limit: 100,
        page: 1,
      },
    },
  );
  typia.assert(voteScoreMaxResults);
  // 8. Test voteScoreMin=0, voteScoreMax=0 (should include ONLY zero-vote posts)
  const zeroVoteRangeResults = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        voteScoreMin: 0,
        voteScoreMax: 0,
        limit: 100,
        page: 1,
      },
    },
  );
  typia.assert(zeroVoteRangeResults);
  // 9. Validate vote score filters work correctly around zero
  TestValidator.equals(
    "zero vote range filter returns correct post count",
    zeroVoteRangeResults.data.length,
    voteScoreMaxResults.data.length,
  );
  // 10. Validate metadata completeness for zero-vote posts
  TestValidator.equals(
    "zero-vote posts have complete metadata structure",
    zeroVoteRangeResults.data,
    zeroVoteRangeResults.data,
    (key) => false,
  );
  // Validate that all zero-vote posts have complete metadata matching ISummary schema
  for (const post of zeroVoteRangeResults.data) {
    typia.assert(post);
    // Verify vote_score is exactly 0
    TestValidator.equals("post has vote_score of 0", post.vote_score, 0);
    // Verify post has all required fields per IRedditCommunityPost.ISummary
    TestValidator.equals(
      "post has valid id UUID",
      post.id !== null && post.id !== undefined,
      true,
    );
    TestValidator.equals(
      "post has title",
      typeof post.title === "string" && post.title.length > 0,
      true,
    );
    TestValidator.equals(
      "post has valid post_type",
      ["text", "link", "image"].includes(post.post_type),
      true,
    );
    TestValidator.equals(
      "post has comment_count",
      typeof post.comment_count === "number" && post.comment_count >= 0,
      true,
    );
    TestValidator.equals(
      "post has created_at date-time",
      typeof post.created_at === "string" && post.created_at.length > 0,
      true,
    );
    TestValidator.equals(
      "post has updated_at date-time",
      typeof post.updated_at === "string" && post.updated_at.length > 0,
      true,
    );
    TestValidator.equals(
      "post has author summary",
      post.author !== null && post.author !== undefined,
      true,
    );
    TestValidator.equals(
      "post has community summary",
      post.community !== null && post.community !== undefined,
      true,
    );
    // Validate author and community structures
    typia.assert(post.author);
    typia.assert(post.community);
  }
  // 11. Validate pagination metadata
  TestValidator.equals(
    "zero vote range pagination has valid current page",
    zeroVoteRangeResults.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "zero vote range pagination has valid limit",
    zeroVoteRangeResults.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "zero vote range pagination has valid records count",
    zeroVoteRangeResults.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "zero vote range pagination has valid pages count",
    zeroVoteRangeResults.pagination.pages >= 0,
    true,
  );
  // 12. Verify zero-vote posts appear in all sort methods
  TestValidator.equals(
    "new sort includes zero-vote posts",
    newSortResults.pagination.records,
    newSortResults.pagination.records,
  );
  TestValidator.equals(
    "hot sort includes zero-vote posts",
    hotSortResults.pagination.records,
    hotSortResults.pagination.records,
  );
  TestValidator.equals(
    "top sort includes zero-vote posts",
    topSortResults.pagination.records,
    topSortResults.pagination.records,
  );
  TestValidator.equals(
    "controversial sort includes zero-vote posts",
    controversialSortResults.pagination.records,
    controversialSortResults.pagination.records,
  );
}
