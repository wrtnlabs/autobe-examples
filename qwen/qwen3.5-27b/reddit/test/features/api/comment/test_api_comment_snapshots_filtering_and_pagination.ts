import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommentSnapshot";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test filtering and pagination capabilities of the comment snapshots endpoint.
 *
 * Validates that the snapshot retrieval endpoint correctly handles date range filtering, content search filtering, pagination parameters, and sorting options. Tests various combinations of filters to ensure they work together correctly and that pagination metadata accurately reflects the filtered result set.
 *
 * 1. Authenticate a member and create a post with a comment.
 * 2. Retrieve snapshots with default parameters to establish baseline.
 * 3. Test date range filtering with from_date and to_date parameters.
 * 4. Test content search filtering with search parameter.
 * 5. Test pagination with page and limit parameters.
 * 6. Test sorting with different sort options (asc/desc).
 * 7. Validate pagination metadata accuracy for filtered results.
 */
export async function test_api_comment_snapshots_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content:
            "This is the initial comment content with some keywords for testing search functionality.",
        },
      },
    );
  typia.assert(comment);
  // 4. Test default snapshot retrieval (no filters)
  const defaultSnapshots =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {},
      },
    );
  typia.assert(defaultSnapshots);
  TestValidator.equals(
    "default pagination current page",
    defaultSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultSnapshots.pagination.limit,
    20,
  );
  // 5. Test date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day in future
  const dateFilteredSnapshots =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          from_date: pastDate.toISOString(),
          to_date: futureDate.toISOString(),
        },
      },
    );
  typia.assert(dateFilteredSnapshots);
  TestValidator.predicate(
    "date filtered snapshots within range",
    dateFilteredSnapshots.data.every((snapshot) => {
      const snapshotDate = new Date(snapshot.snapshot_created_at);
      return snapshotDate >= pastDate && snapshotDate <= futureDate;
    }),
  );
  // 6. Test content search filtering
  const searchSnapshots =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          search: "comment",
        },
      },
    );
  typia.assert(searchSnapshots);
  TestValidator.predicate(
    "search results contain keyword",
    searchSnapshots.data.every((snapshot) =>
      snapshot.content.toLowerCase().includes("comment"),
    ),
  );
  // 7. Test pagination with custom limit
  const paginatedSnapshots =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.equals(
    "pagination current page",
    paginatedSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedSnapshots.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination data count matches limit or less",
    paginatedSnapshots.data.length <= 5,
  );
  // 8. Test sorting by snapshot_created_at_desc (most recent first)
  const sortedDescSnapshots =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          sort: "snapshot_created_at_desc",
        },
      },
    );
  typia.assert(sortedDescSnapshots);
  if (sortedDescSnapshots.data.length > 1) {
    TestValidator.predicate(
      "descending sort order",
      sortedDescSnapshots.data.every((snapshot, index, array) => {
        if (index === 0) return true;
        const current = new Date(snapshot.snapshot_created_at);
        const previous = new Date(array[index - 1].snapshot_created_at);
        return current <= previous;
      }),
    );
  }
  // 9. Test sorting by snapshot_created_at_asc (oldest first)
  const sortedAscSnapshots =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          sort: "snapshot_created_at_asc",
        },
      },
    );
  typia.assert(sortedAscSnapshots);
  if (sortedAscSnapshots.data.length > 1) {
    TestValidator.predicate(
      "ascending sort order",
      sortedAscSnapshots.data.every((snapshot, index, array) => {
        if (index === 0) return true;
        const current = new Date(snapshot.snapshot_created_at);
        const previous = new Date(array[index - 1].snapshot_created_at);
        return current >= previous;
      }),
    );
  }
  // 10. Test combined filters (date range + search + pagination)
  const combinedFilteredSnapshots =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          from_date: pastDate.toISOString(),
          to_date: futureDate.toISOString(),
          search: "content",
          page: 1,
          limit: 10,
          sort: "snapshot_created_at_desc",
        },
      },
    );
  typia.assert(combinedFilteredSnapshots);
  TestValidator.equals(
    "combined filter current page",
    combinedFilteredSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter limit",
    combinedFilteredSnapshots.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "combined filter results within date range",
    combinedFilteredSnapshots.data.every((snapshot) => {
      const snapshotDate = new Date(snapshot.snapshot_created_at);
      return snapshotDate >= pastDate && snapshotDate <= futureDate;
    }),
  );
  TestValidator.predicate(
    "combined filter results contain search term",
    combinedFilteredSnapshots.data.every((snapshot) =>
      snapshot.content.toLowerCase().includes("content"),
    ),
  );
  // 11. Validate pagination metadata accuracy
  TestValidator.predicate(
    "pagination records is non-negative",
    combinedFilteredSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    combinedFilteredSnapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculation is correct",
    combinedFilteredSnapshots.pagination.pages ===
      Math.ceil(
        combinedFilteredSnapshots.pagination.records /
          combinedFilteredSnapshots.pagination.limit,
      ),
  );
}
