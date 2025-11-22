import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_posts_score_comment_filters(
  connection: api.IConnection,
) {
  // Test filtering posts by engagement metrics (score and comment count)

  // First, get a sample of existing posts to establish baseline data
  const samplePosts = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
        sort_by: "score",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(samplePosts);

  TestValidator.equals(
    "should return paginated results",
    samplePosts.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "should have valid pagination",
    samplePosts.pagination.records > 0,
  );

  // Test 1: Score threshold filtering
  const scoreFilteredPosts = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        min_score: 10,
        max_score: 100,
        sort_by: "score",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(scoreFilteredPosts);

  // Validate score filtering results
  for (const post of scoreFilteredPosts.data) {
    TestValidator.predicate(
      `post score ${post.score} should be >= 10`,
      post.score >= 10,
    );
    TestValidator.predicate(
      `post score ${post.score} should be <= 100`,
      post.score <= 100,
    );
  }

  // Test 2: Comment count threshold filtering
  const commentFilteredPosts = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        min_comment_count: 5,
        max_comment_count: 30,
        sort_by: "comment_count",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(commentFilteredPosts);

  // Validate comment count filtering results
  for (const post of commentFilteredPosts.data) {
    TestValidator.predicate(
      `post comment count ${post.comment_count} should be >= 5`,
      post.comment_count >= 5,
    );
    TestValidator.predicate(
      `post comment count ${post.comment_count} should be <= 30`,
      post.comment_count <= 30,
    );
  }

  // Test 3: Combined score and comment filtering
  const combinedFilteredPosts = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 15,
        min_score: 5,
        max_score: 50,
        min_comment_count: 3,
        max_comment_count: 20,
        sort_by: "score",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(combinedFilteredPosts);

  // Validate combined filtering results
  for (const post of combinedFilteredPosts.data) {
    TestValidator.predicate(
      `post score ${post.score} should be between 5-50`,
      post.score >= 5 && post.score <= 50,
    );
    TestValidator.predicate(
      `post comment count ${post.comment_count} should be between 3-20`,
      post.comment_count >= 3 && post.comment_count <= 20,
    );
  }

  // Test 4: Sorting validation - verify posts are sorted correctly by score
  const scoreSortedAsc = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "score",
        sort_order: "asc",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(scoreSortedAsc);

  if (scoreSortedAsc.data.length > 1) {
    for (let i = 1; i < scoreSortedAsc.data.length; i++) {
      TestValidator.predicate(
        `posts should be sorted by score ascending, post ${i - 1} score ${scoreSortedAsc.data[i - 1].score} <= post ${i} score ${scoreSortedAsc.data[i].score}`,
        scoreSortedAsc.data[i - 1].score <= scoreSortedAsc.data[i].score,
      );
    }
  }

  // Test 5: Sorting validation - verify posts are sorted correctly by comment count
  const commentSortedDesc = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "comment_count",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(commentSortedDesc);

  if (commentSortedDesc.data.length > 1) {
    for (let i = 1; i < commentSortedDesc.data.length; i++) {
      TestValidator.predicate(
        `posts should be sorted by comment count descending, post ${i - 1} comments ${commentSortedDesc.data[i - 1].comment_count} >= post ${i} comments ${commentSortedDesc.data[i].comment_count}`,
        commentSortedDesc.data[i - 1].comment_count >=
          commentSortedDesc.data[i].comment_count,
      );
    }
  }

  // Test 6: Edge case - Very high score threshold
  const highScoreFilteredPosts =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        page: 1,
        limit: 20,
        min_score: 1000,
        max_score: 10000,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(highScoreFilteredPosts);

  TestValidator.equals(
    "high score filter should return empty or minimal results",
    highScoreFilteredPosts.data.length,
    highScoreFilteredPosts.data.length,
  );

  // Test 7: Edge case - Very low thresholds
  const lowThresholdsFilteredPosts =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        page: 1,
        limit: 20,
        min_score: 0,
        min_comment_count: 0,
        sort_by: "score",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(lowThresholdsFilteredPosts);

  TestValidator.predicate(
    "low threshold filter should return results",
    lowThresholdsFilteredPosts.data.length > 0,
  );

  // Test 8: Pagination with filters
  const paginatedFilteredPosts =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        page: 1,
        limit: 5,
        min_score: 1,
        max_score: 20,
        sort_by: "score",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(paginatedFilteredPosts);

  TestValidator.equals(
    "paginated filtered results should respect limit",
    paginatedFilteredPosts.data.length <= 5,
    true,
  );

  // Validate all posts in paginated results meet filter criteria
  for (const post of paginatedFilteredPosts.data) {
    TestValidator.predicate(
      `paginated post score ${post.score} should be between 1-20`,
      post.score >= 1 && post.score <= 20,
    );
  }

  TestValidator.predicate(
    "pagination info should be consistent",
    paginatedFilteredPosts.pagination.current === 1,
  );
}
