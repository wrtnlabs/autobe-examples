import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the comment sorting functionality using 'best' sort option on the Reddit Platform.
 *
 * Validates the comment sorting endpoint with 'best' sort order, which surfaces comments
 * with the highest vote scores first. The test verifies proper ranking by score, tie-breaking
 * by creation timestamp, filtering of deleted comments, and complete data structure validation
 * including nested author, post, and community references.
 *
 * Special attention is given to ensuring the sorting algorithm correctly implements the
 * 'best' ranking criteria and that all referenced entities are properly joined with their
 * summary representations containing all required fields.
 *
 * 1. Guest user joins and authenticates via authorize_guest_join utility.
 * 2. Request comment list with sort option set to 'best'.
 * 3. System returns comments ordered by vote score descending (highest score first).
 * 4. For comments with same score, ordered by created_at ascending (older first).
 * 5. Deleted comments are filtered out from results (deleted_at IS NULL).
 * 6. Validates comment structure includes all required fields per IRedditPlatformComment.ISummary.
 * 7. Validates author reference is IRedditPlatformMember.ISummary with id, username, karma, created_at.
 * 8. Validates post reference is IRedditPlatformPost.ISummary with full metadata.
 * 9. Validates pagination metadata: current, limit, records, pages.
 * 10. TestValidator predicates confirm sorting order and data integrity.
 */
export async function test_api_comment_sorting_best_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestAuth);
  // 2. Generate random post ID for testing
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the sort endpoint with 'best' sort option
  const response =
    await api.functional.redditPlatform.guest.posts.comments.sort(
      guestConnection,
      {
        postId,
        body: {
          sort: "best",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformComment.ISortRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages calculation",
    response.pagination.pages,
    response.pagination.records > 0
      ? Math.ceil(response.pagination.records / response.pagination.limit)
      : 0,
  );
  // 5. Validate each comment has correct structure
  for (const comment of response.data) {
    typia.assert(comment);
    // Validate score calculation
    TestValidator.equals(
      "score equals upvotes minus downvotes",
      comment.score,
      comment.upvotes_count - comment.downvotes_count,
    );
    // Validate deleted_at is null for active comments
    TestValidator.equals(
      "deleted_at is null for active comment",
      comment.deleted_at,
      null,
    );
    // Validate author reference
    typia.assert(comment.author);
    TestValidator.predicate(
      "author has valid id",
      comment.author.id.length === 36,
    );
    TestValidator.predicate(
      "author has username",
      comment.author.username.length > 0,
    );
    // Validate post reference
    typia.assert(comment.post);
    TestValidator.predicate("post has valid id", comment.post.id.length === 36);
    TestValidator.predicate("post has title", comment.post.title.length > 0);
    TestValidator.predicate(
      "post has valid type",
      ["text", "link", "image"].includes(comment.post.post_type),
    );
  }
  // 6. Validate sorting order - comments should be sorted by score descending
  if (response.data.length > 1) {
    const sortedCorrectly = response.data.every((comment, index) => {
      if (index === 0) return true;
      const prevComment = response.data[index - 1];
      // Primary sort: score descending
      if (comment.score !== prevComment.score) {
        return comment.score < prevComment.score; // Previous should be higher or equal
      }
      // Secondary sort: created_at ascending (older first) when scores are equal
      return comment.created_at >= prevComment.created_at;
    });
    TestValidator.predicate(
      "comments sorted by score descending, then created_at ascending",
      sortedCorrectly,
    );
  }
  // 7. Validate no deleted comments in results
  for (const comment of response.data) {
    TestValidator.equals(
      `no deleted comment at index ${comment.id}`,
      comment.deleted_at,
      null,
    );
  }
}
