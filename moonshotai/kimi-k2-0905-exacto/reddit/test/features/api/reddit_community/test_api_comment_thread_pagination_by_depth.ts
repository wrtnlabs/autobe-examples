import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test retrieving comments for a post with thread depth filtering to explore
 * hierarchical conversations. Validate that the system correctly filters
 * comments by minimum and maximum thread depth levels, allowing users to focus
 * on top-level discussions or deep nested replies. Ensure pagination works
 * correctly with depth filtering and that thread depth calculations properly
 * represent the comment hierarchy structure.
 */
export async function test_api_comment_thread_pagination_by_depth(
  connection: api.IConnection,
) {
  // Generate test post ID
  const postId = typia.random<string & tags.Format<"uuid">>();

  // Test 1: Filter by minimum thread depth only (focus on deeper discussions)
  const minDepthOnlyRequest = {
    sort_by: "created_at",
    sort_order: "asc",
    page: 1,
    limit: 10,
    thread_depth_min: 2, // Minimum depth of 2 (exclude top-level comments)
  } satisfies IRedditCommunityComment.IRequest;

  const minDepthResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: minDepthOnlyRequest,
    });
  typia.assert(minDepthResult);

  // Validate that all returned comments meet minimum depth requirement
  TestValidator.predicate(
    "all comments meet minimum depth requirement",
    minDepthResult.data.every((comment) => comment.thread_depth >= 2),
  );

  // Test 2: Filter by maximum thread depth only (focus on top-level and shallow discussions)
  const maxDepthOnlyRequest = {
    sort_by: "created_at",
    sort_order: "desc",
    page: 1,
    limit: 15,
    thread_depth_max: 1, // Maximum depth of 1 (only top-level comments)
  } satisfies IRedditCommunityComment.IRequest;

  const maxDepthResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: maxDepthOnlyRequest,
    });
  typia.assert(maxDepthResult);

  // Validate that all returned comments meet maximum depth requirement
  TestValidator.predicate(
    "all comments meet maximum depth requirement",
    maxDepthResult.data.every((comment) => comment.thread_depth <= 1),
  );

  // Test 3: Combined min/max depth filtering (narrow range)
  const combinedDepthRequest = {
    sort_by: "vote_score",
    sort_order: "desc",
    page: 1,
    limit: 20,
    thread_depth_min: 1,
    thread_depth_max: 3, // Depth range 1-3 (moderate thread depth)
  } satisfies IRedditCommunityComment.IRequest;

  const combinedResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: combinedDepthRequest,
    });
  typia.assert(combinedResult);

  // Validate that all comments fall within the specified depth range
  TestValidator.predicate(
    "all comments within depth range",
    combinedResult.data.every(
      (comment) => comment.thread_depth >= 1 && comment.thread_depth <= 3,
    ),
  );

  // Test 4: Pagination with depth filtering
  const paginatedRequest = {
    sort_by: "created_at",
    sort_order: "asc",
    page: 2,
    limit: 5,
    thread_depth_min: 0,
    thread_depth_max: 5,
  } satisfies IRedditCommunityComment.IRequest;

  const paginatedResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: paginatedRequest,
    });
  typia.assert(paginatedResult);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata is valid",
    paginatedResult.pagination.current === 2 &&
      paginatedResult.pagination.limit === 5 &&
      paginatedResult.pagination.pages >= 1 &&
      paginatedResult.pagination.records >= 0,
  );

  // Test 5: Edge case - top-level comments only (depth 0)
  const topLevelOnlyRequest = {
    sort_by: "created_at",
    sort_order: "desc",
    page: 1,
    limit: 25,
    thread_depth_min: 0,
    thread_depth_max: 0, // Only depth 0 (top-level comments)
  } satisfies IRedditCommunityComment.IRequest;

  const topLevelResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: topLevelOnlyRequest,
    });
  typia.assert(topLevelResult);

  // Validate only top-level comments are returned
  TestValidator.predicate(
    "only top-level comments returned",
    topLevelResult.data.every((comment) => comment.thread_depth === 0),
  );

  // Test 6: Sort by thread depth with different orders
  const sortByDepthRequest = {
    sort_by: "depth",
    sort_order: "asc",
    page: 1,
    limit: 10,
    thread_depth_min: 0,
    thread_depth_max: 10,
  } satisfies IRedditCommunityComment.IRequest;

  const depthSortedResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: sortByDepthRequest,
    });
  typia.assert(depthSortedResult);

  // Validate proper sorting by thread depth
  TestValidator.predicate(
    "comments sorted by thread depth ascending",
    depthSortedResult.data.every((comment, index) => {
      if (index === 0) return true;
      return (
        comment.thread_depth >= depthSortedResult.data[index - 1].thread_depth
      );
    }),
  );

  // Validate comment structure integrity
  TestValidator.predicate(
    "all comments have valid structure",
    combinedResult.data.every(
      (comment) =>
        typia.is<IRedditCommunityComment.ISummary>(comment) &&
        comment.thread_depth >= 0 &&
        comment.thread_depth <= 10 &&
        typeof comment.content === "string" &&
        comment.content.length > 0 &&
        typia.is<string & tags.Format<"uuid">>(comment.id) &&
        comment.upvote_count >= 0 &&
        comment.downvote_count >= 0 &&
        typia.is<IRedditCommunityMember.ISummary>(comment.author),
    ),
  );

  // Test response data consistency with page information
  TestValidator.predicate(
    "page data count matches limit request",
    combinedResult.data.length <= combinedDepthRequest.limit &&
      combinedResult.data.length >= 0,
  );

  // Test 7: Complex filtering with multiple criteria
  const complexFilterRequest = {
    sort_by: "created_at",
    sort_order: "desc",
    page: 1,
    limit: 30,
    thread_depth_min: 1,
    thread_depth_max: 4,
    is_deleted: false,
    is_removed: false,
    vote_score_min: 0,
  } satisfies IRedditCommunityComment.IRequest;

  const complexResult =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId,
      body: complexFilterRequest,
    });
  typia.assert(complexResult);

  // Validate that complex filtering works correctly
  TestValidator.predicate(
    "complex filtering applies all criteria",
    complexResult.data.every(
      (comment) =>
        comment.thread_depth >= 1 &&
        comment.thread_depth <= 4 &&
        comment.is_deleted === false &&
        comment.is_removed === false &&
        comment.upvote_count >= 0,
    ),
  );

  TestValidator.predicate(
    "pagination total calculation is correct",
    combinedResult.pagination.pages <=
      Math.ceil(combinedResult.pagination.records / combinedDepthRequest.limit),
  );
}
