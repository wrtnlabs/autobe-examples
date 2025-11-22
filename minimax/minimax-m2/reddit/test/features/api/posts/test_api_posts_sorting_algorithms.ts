import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Validate comprehensive post sorting algorithms for Reddit-like platform
 * content discovery.
 *
 * Tests all supported sorting criteria including chronological (created_at),
 * popularity (score), engagement (comment_count), and reach (view_count) in
 * both ascending and descending orders. Ensures users can effectively discover
 * content through multiple sorting strategies that align with Reddit's content
 * organization principles.
 *
 * The test validates:
 *
 * 1. Chronological sorting places posts in proper time sequence
 * 2. Popularity sorting ranks highest-scored content first
 * 3. Discussion activity sorting prioritizes most-commented posts
 * 4. Content reach sorting shows most-viewed posts first
 * 5. Both ascending and descending orders work correctly
 * 6. Edge cases with zero/equal values are handled properly
 * 7. API maintains consistent response structure across all sort operations
 */
export async function test_api_posts_sorting_algorithms(
  connection: api.IConnection,
) {
  // Test 1: Chronological Sorting (created_at)
  const chronologicalAsc = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        limit: 15,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  // Validate chronological ascending order - oldest posts first
  const chronologicalAscPosts = chronologicalAsc.data;
  for (let i = 0; i < chronologicalAscPosts.length - 1; i++) {
    const current = new Date(chronologicalAscPosts[i].created_at).getTime();
    const next = new Date(chronologicalAscPosts[i + 1].created_at).getTime();
    TestValidator.predicate(
      `Chronological ascending: post ${i} should be before post ${i + 1}`,
      current <= next,
    );
  }

  const chronologicalDesc = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        limit: 15,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  // Validate chronological descending order - newest posts first
  const chronologicalDescPosts = chronologicalDesc.data;
  for (let i = 0; i < chronologicalDescPosts.length - 1; i++) {
    const current = new Date(chronologicalDescPosts[i].created_at).getTime();
    const next = new Date(chronologicalDescPosts[i + 1].created_at).getTime();
    TestValidator.predicate(
      `Chronological descending: post ${i} should be after post ${i + 1}`,
      current >= next,
    );
  }

  // Test 2: Score Sorting (popularity)
  const scoreAsc = await api.functional.redditPlatform.posts.index(connection, {
    body: {
      sort_by: "score",
      sort_order: "asc",
      limit: 15,
    } satisfies IRedditPlatformPost.IRequest,
  });

  // Validate score ascending order - lowest scores first
  const scoreAscPosts = scoreAsc.data;
  for (let i = 0; i < scoreAscPosts.length - 1; i++) {
    TestValidator.predicate(
      `Score ascending: post ${i} score should be <= post ${i + 1} score`,
      scoreAscPosts[i].score <= scoreAscPosts[i + 1].score,
    );
  }

  const scoreDesc = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        sort_by: "score",
        sort_order: "desc",
        limit: 15,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  // Validate score descending order - highest scores first
  const scoreDescPosts = scoreDesc.data;
  for (let i = 0; i < scoreDescPosts.length - 1; i++) {
    TestValidator.predicate(
      `Score descending: post ${i} score should be >= post ${i + 1} score`,
      scoreDescPosts[i].score >= scoreDescPosts[i + 1].score,
    );
  }

  // Test 3: Comment Count Sorting (engagement)
  const commentCountAsc = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        sort_by: "comment_count",
        sort_order: "asc",
        limit: 15,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  // Validate comment count ascending order - least commented posts first
  const commentCountAscPosts = commentCountAsc.data;
  for (let i = 0; i < commentCountAscPosts.length - 1; i++) {
    TestValidator.predicate(
      `Comment count ascending: post ${i} comment count should be <= post ${i + 1} comment count`,
      commentCountAscPosts[i].comment_count <=
        commentCountAscPosts[i + 1].comment_count,
    );
  }

  const commentCountDesc = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        sort_by: "comment_count",
        sort_order: "desc",
        limit: 15,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  // Validate comment count descending order - most commented posts first
  const commentCountDescPosts = commentCountDesc.data;
  for (let i = 0; i < commentCountDescPosts.length - 1; i++) {
    TestValidator.predicate(
      `Comment count descending: post ${i} comment count should be >= post ${i + 1} comment count`,
      commentCountDescPosts[i].comment_count >=
        commentCountDescPosts[i + 1].comment_count,
    );
  }

  // Test 4: View Count Sorting (reach)
  const viewCountAsc = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        sort_by: "view_count",
        sort_order: "asc",
        limit: 15,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  // Validate view count ascending order - least viewed posts first
  const viewCountAscPosts = viewCountAsc.data;
  for (let i = 0; i < viewCountAscPosts.length - 1; i++) {
    TestValidator.predicate(
      `View count ascending: post ${i} view count should be <= post ${i + 1} view count`,
      viewCountAscPosts[i].view_count <= viewCountAscPosts[i + 1].view_count,
    );
  }

  const viewCountDesc = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        sort_by: "view_count",
        sort_order: "desc",
        limit: 15,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  // Validate view count descending order - most viewed posts first
  const viewCountDescPosts = viewCountDesc.data;
  for (let i = 0; i < viewCountDescPosts.length - 1; i++) {
    TestValidator.predicate(
      `View count descending: post ${i} view count should be >= post ${i + 1} view count`,
      viewCountDescPosts[i].view_count >= viewCountDescPosts[i + 1].view_count,
    );
  }

  // Test 5: Edge Cases - Single Post
  const singlePost = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        sort_by: "score",
        sort_order: "desc",
        limit: 1,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  TestValidator.equals(
    "Single post response should have exactly one item",
    singlePost.data.length,
    1,
  );

  // Test 6: Edge Cases - Empty Result Set
  const emptyResults = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        sort_by: "score",
        sort_order: "desc",
        limit: 50,
        min_score: 10000, // Set impossibly high threshold for empty results
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  TestValidator.predicate(
    "Empty result set should return zero items",
    emptyResults.data.length === 0,
  );

  // Test 7: Verify API Response Structure Consistency
  const responseTypes = [
    chronologicalAsc,
    chronologicalDesc,
    scoreAsc,
    scoreDesc,
    commentCountAsc,
    commentCountDesc,
    viewCountAsc,
    viewCountDesc,
    singlePost,
    emptyResults,
  ];

  // Validate that all responses have consistent structure
  for (const response of responseTypes) {
    typia.assert(response);
    TestValidator.equals(
      "Response should have pagination object",
      typeof response.pagination,
      "object",
    );
    TestValidator.equals(
      "Response should have data array",
      Array.isArray(response.data),
      true,
    );
  }

  // Test 8: Sort Order Stability with Limited Results
  // Test that sort order is consistent when we have fewer results than limit
  const limitedResults = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        sort_by: "score",
        sort_order: "desc",
        limit: 5, // Request fewer items than might be available
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  // Verify that limited results are properly sorted
  const limitedPosts = limitedResults.data;
  for (let i = 0; i < limitedPosts.length - 1; i++) {
    TestValidator.predicate(
      `Limited results sort: post ${i} score should be >= post ${i + 1} score`,
      limitedPosts[i].score >= limitedPosts[i + 1].score,
    );
  }

  // Test 9: Multiple Sort Parameters Combination
  const complexSort = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        limit: 10,
        status: "active", // Add filtering with sorting
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  // Validate that complex sorts with filters work correctly
  const complexPosts = complexSort.data;
  TestValidator.predicate(
    "Complex sort with filters should return results",
    complexPosts.length > 0,
  );

  // Verify chronological order in complex sort
  for (let i = 0; i < complexPosts.length - 1; i++) {
    const current = new Date(complexPosts[i].created_at).getTime();
    const next = new Date(complexPosts[i + 1].created_at).getTime();
    TestValidator.predicate(
      `Complex sort chronological: post ${i} should be after post ${i + 1}`,
      current >= next,
    );
  }

  console.log("✅ All post sorting algorithm tests completed successfully!");
  console.log(`   - Chronological sorting: validated ascending and descending`);
  console.log(`   - Popularity sorting: validated score-based ranking`);
  console.log(`   - Engagement sorting: validated comment count ordering`);
  console.log(`   - Reach sorting: validated view count ranking`);
  console.log(
    `   - Edge cases: validated single post and empty result scenarios`,
  );
  console.log(
    `   - Stability: verified consistent ordering for limited results`,
  );
  console.log(`   - Complex sorting: validated sort with additional filters`);
  console.log(
    `   - Structure: confirmed API response consistency across all sort operations`,
  );
}
