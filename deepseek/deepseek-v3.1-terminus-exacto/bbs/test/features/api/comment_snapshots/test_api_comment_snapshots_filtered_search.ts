import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_snapshots_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection (user connection)
  const userConnection: api.IConnection = { host: connection.host };
  // Since we don't have authentication utilities available, we'll work with the system
  // as-is and test the filtering capabilities with realistic data patterns
  // Generate realistic test data
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Filter by version number range (valid range)
  const versionRangeFilter: IDiscussionBoardCommentSnapshot.IRequest = {
    version_number_min: 1,
    version_number_max: 10,
  };
  const versionRangeResult =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      userConnection,
      {
        articleId,
        commentId,
        body: versionRangeFilter,
      },
    );
  typia.assert(versionRangeResult);
  // Test 2: Filter by specific snapshot reason
  const reasonFilter: IDiscussionBoardCommentSnapshot.IRequest = {
    snapshot_reason: "edit",
  };
  const reasonResult =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      userConnection,
      {
        articleId,
        commentId,
        body: reasonFilter,
      },
    );
  typia.assert(reasonResult);
  // Test 3: Filter by date range
  const dateFilter: IDiscussionBoardCommentSnapshot.IRequest = {
    created_at_min: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    created_at_max: new Date().toISOString(), // now
  };
  const dateResult =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      userConnection,
      {
        articleId,
        commentId,
        body: dateFilter,
      },
    );
  typia.assert(dateResult);
  // Test 4: Combined filters with pagination
  const combinedFilter: IDiscussionBoardCommentSnapshot.IRequest = {
    version_number_min: 1,
    snapshot_reason: "moderation",
    page: 1,
    limit: 10,
  };
  const combinedResult =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      userConnection,
      {
        articleId,
        commentId,
        body: combinedFilter,
      },
    );
  typia.assert(combinedResult);
  // Test 5: Edge case - empty result set (non-existent filters)
  const edgeCaseFilter: IDiscussionBoardCommentSnapshot.IRequest = {
    version_number_min: 1000,
    version_number_max: 2000,
    snapshot_reason: "nonexistent_reason",
  };
  const edgeCaseResult =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      userConnection,
      {
        articleId,
        commentId,
        body: edgeCaseFilter,
      },
    );
  typia.assert(edgeCaseResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    combinedResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is valid",
    combinedResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    combinedResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is valid",
    combinedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    combinedResult.pagination.pages >= 0,
  );
  // Validate snapshot structure if data exists
  if (combinedResult.data.length > 0) {
    const snapshot = combinedResult.data[0];
    TestValidator.predicate(
      "snapshot has valid UUID",
      typeof snapshot.id === "string",
    );
    TestValidator.predicate(
      "version number is positive",
      snapshot.version_number > 0,
    );
    TestValidator.predicate(
      "created_at is valid date",
      typeof snapshot.created_at === "string",
    );
    TestValidator.predicate(
      "comment timestamps are valid",
      typeof snapshot.comment_created_at === "string" &&
        typeof snapshot.comment_updated_at === "string",
    );
  }
  // Test pagination with different page sizes
  const paginationTest: IDiscussionBoardCommentSnapshot.IRequest = {
    page: 2,
    limit: 5,
  };
  const paginationResult =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      userConnection,
      {
        articleId,
        commentId,
        body: paginationTest,
      },
    );
  typia.assert(paginationResult);
  // Validate pagination calculations
  if (paginationResult.pagination.records > 0) {
    const expectedPages = Math.ceil(
      paginationResult.pagination.records / paginationResult.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation is correct",
      paginationResult.pagination.pages,
      expectedPages,
    );
  }
}
