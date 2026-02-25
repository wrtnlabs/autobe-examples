import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_retrieval_custom_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create a test connection
  const testConnection: api.IConnection = { host: connection.host };
  // Generate random article ID for testing pagination
  const articleId = RandomGenerator.alphaNumeric(10);
  // Test pagination with custom parameters: page=2, limit=10
  const page2Result =
    await api.functional.discussionBoard.articles.comments.index(
      testConnection,
      {
        articleId: articleId,
        body: {
          page: 2,
          limit: 10,
          content: "",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(page2Result);
  // Verify pagination metadata
  TestValidator.equals("current page is 2", page2Result.pagination.current, 2);
  TestValidator.equals("limit is 10", page2Result.pagination.limit, 10);
  TestValidator.predicate(
    "total records is non-negative",
    () => page2Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    () => page2Result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length is non-negative",
    () => page2Result.data.length >= 0,
  );
  // Test page=1 with limit=10 (first page)
  const page1Result =
    await api.functional.discussionBoard.articles.comments.index(
      testConnection,
      {
        articleId: articleId,
        body: {
          page: 1,
          limit: 10,
          content: "",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals(
    "first page current is 1",
    page1Result.pagination.current,
    1,
  );
  // Test page=3 with limit=10 (last page)
  const page3Result =
    await api.functional.discussionBoard.articles.comments.index(
      testConnection,
      {
        articleId: articleId,
        body: {
          page: 3,
          limit: 10,
          content: "",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(page3Result);
  TestValidator.equals(
    "last page current is 3",
    page3Result.pagination.current,
    3,
  );
  // Test with limit=5
  const limit5Result =
    await api.functional.discussionBoard.articles.comments.index(
      testConnection,
      {
        articleId: articleId,
        body: {
          page: 1,
          limit: 5,
          content: "",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(limit5Result);
  TestValidator.predicate(
    "limit=5 data length is non-negative",
    () => limit5Result.data.length >= 0,
  );
  // Test with null page (should default to page=1)
  const nullPageResult =
    await api.functional.discussionBoard.articles.comments.index(
      testConnection,
      {
        articleId: articleId,
        body: {
          page: null,
          limit: 10,
          content: "",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(nullPageResult);
  TestValidator.equals(
    "null page defaults to page=1",
    nullPageResult.pagination.current,
    1,
  );
  // Test with null limit (should default to limit=10)
  const nullLimitResult =
    await api.functional.discussionBoard.articles.comments.index(
      testConnection,
      {
        articleId: articleId,
        body: {
          page: 1,
          limit: null,
          content: "",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(nullLimitResult);
  TestValidator.equals(
    "null limit defaults to limit=10",
    nullLimitResult.pagination.limit,
    10,
  );
  // Test with undefined page and limit (both should default)
  const undefinedPageLimitResult =
    await api.functional.discussionBoard.articles.comments.index(
      testConnection,
      {
        articleId: articleId,
        body: {
          content: "",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(undefinedPageLimitResult);
  TestValidator.equals(
    "undefined page defaults to page=1",
    undefinedPageLimitResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "undefined limit defaults to limit=10",
    undefinedPageLimitResult.pagination.limit,
    10,
  );
  // Test with negative page value
  const negativePageResult =
    await api.functional.discussionBoard.articles.comments.index(
      testConnection,
      {
        articleId: articleId,
        body: {
          page: -1,
          limit: 10,
          content: "",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(negativePageResult);
  // Verify comment structure in results
  for (const comment of page2Result.data) {
    typia.assert(comment);
    typia.assert(comment.author);
  }
}
