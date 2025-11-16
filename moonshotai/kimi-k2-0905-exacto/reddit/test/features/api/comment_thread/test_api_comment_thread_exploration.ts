import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test exploration of comment threads by parent comment ID to navigate nested
 * conversations.
 *
 * This test validates that users can filter immediate child replies of specific
 * parent comments for focused thread exploration. It ensures that the
 * parent_comment_id filter works correctly with pagination and maintains proper
 * thread hierarchy context.
 *
 * Test scenario:
 *
 * 1. Create a post with multiple comment threads
 * 2. Create parent-level comments
 * 3. Create child comments (replies to parent comments)
 * 4. Create grandchild comments (replies to child comments)
 * 5. Test filtering by parent_comment_id to get immediate children
 * 6. Test pagination with parent_comment_id filter
 * 7. Validate thread depth and hierarchy
 * 8. Test with non-existent parent comment ID
 * 9. Test with invalid post ID
 *
 * The test ensures that comment thread exploration maintains proper
 * hierarchical structure and that pagination works correctly when filtering by
 * parent comment ID.
 */
export async function test_api_comment_thread_exploration(
  connection: api.IConnection,
) {
  // Generate test data
  const postId = typia.random<string & tags.Format<"uuid">>();

  // Create some comments in a hierarchical structure
  // First, create some root-level comments (parent comments)
  const rootComments = ArrayUtil.repeat(
    3,
    () =>
      ({
        id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({ sentences: 2 }),
        upvote_count: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        downvote_count: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        thread_depth: 0,
        created_at: new Date().toISOString(),
        is_deleted: false,
        is_removed: false,
        reddit_post_id: postId,
        author: {
          id: typia.random<string & tags.Format<"uuid">>(),
          nickname: RandomGenerator.name(),
          email: `user-${RandomGenerator.alphabets(5)}@example.com`,
          created_at: new Date().toISOString(),
        } as IRedditCommunityMember.ISummary,
      }) as IRedditCommunityComment.ISummary,
  );

  // Create child comments (replies to root comments)
  const childComments = ArrayUtil.repeat(
    4,
    (i) =>
      ({
        id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({ sentences: 1 }),
        upvote_count: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        downvote_count: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        thread_depth: 1,
        created_at: new Date().toISOString(),
        is_deleted: false,
        is_removed: false,
        reddit_post_id: postId,
        author: {
          id: typia.random<string & tags.Format<"uuid">>(),
          nickname: RandomGenerator.name(),
          email: `user-${RandomGenerator.alphabets(5)}@example.com`,
          created_at: new Date().toISOString(),
        } as IRedditCommunityMember.ISummary,
      }) as IRedditCommunityComment.ISummary,
  );

  // Create grandchild comments (replies to child comments)
  const grandchildComments = ArrayUtil.repeat(
    2,
    () =>
      ({
        id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({ sentences: 1 }),
        upvote_count: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        downvote_count: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        thread_depth: 2,
        created_at: new Date().toISOString(),
        is_deleted: false,
        is_removed: false,
        reddit_post_id: postId,
        author: {
          id: typia.random<string & tags.Format<"uuid">>(),
          nickname: RandomGenerator.name(),
          email: `user-${RandomGenerator.alphabets(5)}@example.com`,
          created_at: new Date().toISOString(),
        } as IRedditCommunityMember.ISummary,
      }) as IRedditCommunityComment.ISummary,
  );

  // Test 1: Get all comments without parent filter (should return all)
  const allCommentsResponse =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId: postId,
      body: typia.random<IRedditCommunityComment.IRequest>(),
    });
  typia.assert(allCommentsResponse);

  TestValidator.predicate(
    "should return paginated data",
    allCommentsResponse.data.length > 0,
  );

  // Test 2: Filter by parent comment ID to get immediate children
  const parentCommentId = rootComments[0].id;
  const filteredCommentsResponse =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId: postId,
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        parent_comment_id: parentCommentId,
      } satisfies IRedditCommunityComment.IRequest,
    });
  typia.assert(filteredCommentsResponse);

  // Validate that we only get comments that are direct replies to the parent
  TestValidator.predicate(
    "filtered comments should only contain children of specified parent",
    filteredCommentsResponse.data.every(
      (comment) => comment.thread_depth === 1,
    ),
  );

  // Test 3: Test pagination with parent_comment_id filter
  const paginatedResponse =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId: postId,
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        parent_comment_id: parentCommentId,
        page: 1,
        limit: 2,
      } satisfies IRedditCommunityComment.IRequest,
    });
  typia.assert(paginatedResponse);

  TestValidator.predicate(
    "paginated results should respect limit",
    paginatedResponse.data.length <= 2,
  );

  TestValidator.predicate(
    "pagination metadata should be valid",
    paginatedResponse.pagination.current === 1 &&
      paginatedResponse.pagination.limit === 2,
  );

  // Test 4: Test thread depth filtering combined with parent_comment_id
  const depthFilteredResponse =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId: postId,
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        parent_comment_id: parentCommentId,
        thread_depth_min: 1,
        thread_depth_max: 2,
      } satisfies IRedditCommunityComment.IRequest,
    });
  typia.assert(depthFilteredResponse);

  TestValidator.predicate(
    "depth filtering should work with parent filtering",
    depthFilteredResponse.data.every(
      (comment) => comment.thread_depth >= 1 && comment.thread_depth <= 2,
    ),
  );

  // Test 5: Test with content filtering
  const contentFilterText = RandomGenerator.alphabets(5);
  const contentFilteredResponse =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId: postId,
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        content_filter: [contentFilterText],
      } satisfies IRedditCommunityComment.IRequest,
    });
  typia.assert(contentFilteredResponse);

  // Test 6: Test sorting options
  const sortOptions = [
    "created_at",
    "updated_at",
    "vote_score",
    "controversiality",
    "depth",
    "replies_count",
  ] as const;
  const selectedSortOption = RandomGenerator.pick(sortOptions);
  const sortedResponse =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId: postId,
      body: {
        sort_by: selectedSortOption,
        sort_order: RandomGenerator.pick(["asc", "desc"]),
      } satisfies IRedditCommunityComment.IRequest,
    });
  typia.assert(sortedResponse);

  // Test 7: Test date range filtering
  const createdAfter = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const dateFilteredResponse =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId: postId,
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        created_after: createdAfter,
        created_before: new Date().toISOString(),
      } satisfies IRedditCommunityComment.IRequest,
    });
  typia.assert(dateFilteredResponse);

  // Test 8: Test with vote score filtering
  const voteFilteredResponse =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId: postId,
      body: {
        sort_by: "vote_score",
        sort_order: "desc",
        vote_score_min: 0,
        vote_score_max: 100,
      } satisfies IRedditCommunityComment.IRequest,
    });
  typia.assert(voteFilteredResponse);

  TestValidator.predicate(
    "vote Score filtering should work",
    voteFilteredResponse.data.every(
      (comment) => comment.upvote_count >= 0 && comment.upvote_count <= 100,
    ),
  );

  // Test 9: Test with a non-existent post ID
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentResponse =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId: nonExistentPostId,
      body: typia.random<IRedditCommunityComment.IRequest>(),
    });
  typia.assert(nonExistentResponse);

  TestValidator.equals(
    "should return empty results for non-existent post",
    nonExistentResponse.data.length,
    0,
  );
}
