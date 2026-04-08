import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_feed_sorting_algorithms(
  connection: api.IConnection,
): Promise<void> {
  // Test all four sorting algorithms and time range filters for post feed
  //
  // Sorting algorithms tested:
  // 1. 'hot' - engagement decay algorithm (vote_score / exponential_decay)
  // 2. 'new' - reverse chronological order (created_at DESC)
  // 3. 'top' - highest vote score, with timeRange filters
  // 4. 'controversial' - lowest absolute vote score (balanced votes)
  //
  // TimeRange filters tested: day, week, month, year, all
  // ============================================
  // TEST 1: 'new' sorting (reverse chronological)
  // ============================================
  const newSortResponse = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "new",
        limit: 20,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(newSortResponse);
  // Verify response structure
  TestValidator.equals(
    "new sort response should have data array",
    Array.isArray(newSortResponse.data),
    true,
  );
  TestValidator.predicate(
    "new sort response should have pagination info",
    newSortResponse.pagination !== undefined,
  );
  // Verify 'new' sorting: posts should be in reverse chronological order (newest first)
  for (let i = 0; i < newSortResponse.data.length - 1; i++) {
    const current = newSortResponse.data[i];
    const next = newSortResponse.data[i + 1];
    const currentTime = new Date(current.createdAt).getTime();
    const nextTime = new Date(next.createdAt).getTime();
    TestValidator.predicate(
      `"new" sort: post ${i} created at ${current.createdAt} should be >= post ${i + 1} created at ${next.createdAt}`,
      currentTime >= nextTime,
    );
  }
  // ============================================
  // TEST 2: 'top' sorting (highest vote score)
  // ============================================
  const topSortResponse = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "top",
        limit: 20,
        timeRange: "all",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topSortResponse);
  // Verify 'top' sorting: posts should be ordered by highest vote score (descending)
  for (let i = 0; i < topSortResponse.data.length - 1; i++) {
    const current = topSortResponse.data[i];
    const next = topSortResponse.data[i + 1];
    TestValidator.predicate(
      `"top" sort: post ${i} vote score (${current.voteScore}) should be >= post ${i + 1} score (${next.voteScore})`,
      current.voteScore >= next.voteScore,
    );
  }
  // ============================================
  // TEST 3: 'top' sorting with all timeRange filters
  // ============================================
  const timeRanges = ["day", "week", "month", "year", "all"] as const;
  for (const timeRange of timeRanges) {
    const topWithTimeResponse = await api.functional.redditClone.posts.index(
      connection,
      {
        body: {
          sort: "top",
          limit: 20,
          timeRange: timeRange,
        } satisfies IRedditClonePost.IRequest,
      },
    );
    typia.assert(topWithTimeResponse);
    TestValidator.predicate(
      `"top" with timeRange "${timeRange}" returns valid response with data array`,
      topWithTimeResponse.data !== undefined &&
        Array.isArray(topWithTimeResponse.data),
    );
    TestValidator.predicate(
      `"top" with timeRange "${timeRange}" returns valid pagination`,
      topWithTimeResponse.pagination !== undefined,
    );
    // Verify ordering is still by vote score descending
    for (let i = 0; i < topWithTimeResponse.data.length - 1; i++) {
      const current = topWithTimeResponse.data[i];
      const next = topWithTimeResponse.data[i + 1];
      TestValidator.predicate(
        `"top" sort with timeRange "${timeRange}": post ${i} score (${current.voteScore}) should be >= post ${i + 1} score (${next.voteScore})`,
        current.voteScore >= next.voteScore,
      );
    }
  }
  // ============================================
  // TEST 4: 'controversial' sorting
  // ============================================
  const controversialSortResponse =
    await api.functional.redditClone.posts.index(connection, {
      body: {
        sort: "controversial",
        limit: 20,
        timeRange: "all",
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(controversialSortResponse);
  // Verify 'controversial' sorting: posts should be ordered by lowest absolute vote score (most balanced)
  // Controversial posts have votes that are closely matched (upvotes ≈ downvotes), resulting in score close to 0
  for (let i = 0; i < controversialSortResponse.data.length - 1; i++) {
    const current = controversialSortResponse.data[i];
    const next = controversialSortResponse.data[i + 1];
    const currentAbs = Math.abs(current.voteScore);
    const nextAbs = Math.abs(next.voteScore);
    TestValidator.predicate(
      `"controversial" sort: post ${i} absolute score (${currentAbs}) should be <= post ${i + 1} absolute score (${nextAbs})`,
      currentAbs <= nextAbs,
    );
  }
  // ============================================
  // TEST 5: 'controversial' with all timeRange filters
  // ============================================
  for (const timeRange of timeRanges) {
    const controversialWithTimeResponse =
      await api.functional.redditClone.posts.index(connection, {
        body: {
          sort: "controversial",
          limit: 20,
          timeRange: timeRange,
        } satisfies IRedditClonePost.IRequest,
      });
    typia.assert(controversialWithTimeResponse);
    TestValidator.predicate(
      `"controversial" with timeRange "${timeRange}" returns valid response`,
      controversialWithTimeResponse.data !== undefined,
    );
    // Verify ordering by absolute score ascending
    for (let i = 0; i < controversialWithTimeResponse.data.length - 1; i++) {
      const current = controversialWithTimeResponse.data[i];
      const next = controversialWithTimeResponse.data[i + 1];
      const currentAbs = Math.abs(current.voteScore);
      const nextAbs = Math.abs(next.voteScore);
      TestValidator.predicate(
        `"controversial" sort with timeRange "${timeRange}": post ${i} abs score (${currentAbs}) should be <= post ${i + 1} abs score (${nextAbs})`,
        currentAbs <= nextAbs,
      );
    }
  }
  // ============================================
  // TEST 6: 'hot' sorting (engagement decay algorithm)
  // ============================================
  const hotSortResponse = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "hot",
        limit: 20,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(hotSortResponse);
  // 'hot' sorting uses engagement decay algorithm: vote_score / exponential_decay(created_at)
  // Posts with higher scores and more recent timestamps rank higher
  // Verify that results are ordered by hot score (higher engagement and recency rank higher)
  const calculateHotScore = (post: IRedditClonePost.ISummary): number => {
    const postAgeHours =
      (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
    const decayFactor = Math.pow(postAgeHours + 2, 1.5);
    return post.voteScore / decayFactor;
  };
  for (let i = 0; i < hotSortResponse.data.length - 1; i++) {
    const current = hotSortResponse.data[i];
    const next = hotSortResponse.data[i + 1];
    const currentHotScore = calculateHotScore(current);
    const nextHotScore = calculateHotScore(next);
    TestValidator.predicate(
      `"hot" sort: post "${current.title.substring(0, 30)}" hot score (${currentHotScore.toFixed(4)}) should be >= post "${next.title.substring(0, 30)}" hot score (${nextHotScore.toFixed(4)})`,
      currentHotScore >= nextHotScore,
    );
  }
  // ============================================
  // TEST 7: Default sort (should be 'hot')
  // ============================================
  const defaultSortResponse = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(defaultSortResponse);
  TestValidator.predicate(
    "default sort returns valid response",
    defaultSortResponse.data !== undefined &&
      Array.isArray(defaultSortResponse.data),
  );
  // ============================================
  // TEST 8: Pagination with sorting
  // ============================================
  const paginatedResponse = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "top",
        limit: 5,
        timeRange: "all",
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit should match request",
    paginatedResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination should have total records",
    paginatedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have total pages",
    paginatedResponse.pagination.pages >= 0,
  );
  // ============================================
  // TEST 9: Sorting with community filter
  // ============================================
  // Get a community ID from existing posts if available
  if (topSortResponse.data.length > 0) {
    const communityId = topSortResponse.data[0].community.id;
    const communityNewResponse = await api.functional.redditClone.posts.index(
      connection,
      {
        body: {
          communityId: communityId,
          sort: "new",
          limit: 10,
        } satisfies IRedditClonePost.IRequest,
      },
    );
    typia.assert(communityNewResponse);
    // Verify all returned posts belong to the specified community
    for (const post of communityNewResponse.data) {
      TestValidator.equals(
        "Community filter should return posts only from specified community",
        post.community.id,
        communityId,
      );
    }
    const communityTopResponse = await api.functional.redditClone.posts.index(
      connection,
      {
        body: {
          communityId: communityId,
          sort: "top",
          limit: 10,
          timeRange: "all",
        } satisfies IRedditClonePost.IRequest,
      },
    );
    typia.assert(communityTopResponse);
    // Verify 'top' ordering within community
    for (let i = 0; i < communityTopResponse.data.length - 1; i++) {
      const current = communityTopResponse.data[i];
      const next = communityTopResponse.data[i + 1];
      TestValidator.predicate(
        `Community "top" sort: post ${i} score (${current.voteScore}) should be >= post ${i + 1} score (${next.voteScore})`,
        current.voteScore >= next.voteScore,
      );
    }
  }
  // ============================================
  // TEST 10: Sorting with post type filter
  // ============================================
  const textPostsResponse = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "new",
        limit: 10,
        type: "text",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(textPostsResponse);
  // Verify all returned posts are text type
  for (const post of textPostsResponse.data) {
    TestValidator.equals(
      "Type filter should return only text posts",
      post.type,
      "text",
    );
  }
  const linkPostsResponse = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "new",
        limit: 10,
        type: "link",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(linkPostsResponse);
  for (const post of linkPostsResponse.data) {
    TestValidator.equals(
      "Type filter should return only link posts",
      post.type,
      "link",
    );
  }
  const imagePostsResponse = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "new",
        limit: 10,
        type: "image",
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(imagePostsResponse);
  for (const post of imagePostsResponse.data) {
    TestValidator.equals(
      "Type filter should return only image posts",
      post.type,
      "image",
    );
  }
  // ============================================
  // TEST 11: Sorting consistency
  // ============================================
  // Call the same endpoint twice and verify consistent results
  const firstCall = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "new",
      limit: 10,
    } satisfies IRedditClonePost.IRequest,
  });
  typia.assert(firstCall);
  const secondCall = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "new",
      limit: 10,
    } satisfies IRedditClonePost.IRequest,
  });
  typia.assert(secondCall);
  // Both calls should return the same order for 'new' sorting
  if (firstCall.data.length > 0 && secondCall.data.length > 0) {
    TestValidator.equals(
      "Sequential 'new' sort calls should return posts in same order",
      firstCall.data[0].id,
      secondCall.data[0].id,
    );
  }
}
