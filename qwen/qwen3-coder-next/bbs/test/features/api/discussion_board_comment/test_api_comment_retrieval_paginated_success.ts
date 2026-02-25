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

export async function test_api_comment_retrieval_paginated_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique test article ID (using available API only)
  const testArticleId = typia.random<string & tags.Format<"uuid">>();
  // Create connection for testing
  const testConnection: api.IConnection = { host: connection.host };
  // Test default pagination (page=1, limit=20)
  const defaultPageRequest = {
    content: "Test content",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardComment.IRequest;
  const defaultPageResponse =
    await api.functional.discussionBoard.articles.comments.index(
      testConnection,
      {
        articleId: testArticleId,
        body: defaultPageRequest,
      },
    );
  typia.assert(defaultPageResponse);
  // Verify pagination metadata
  TestValidator.equals(
    "default page: current should be 1",
    defaultPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default page: limit should be 20",
    defaultPageResponse.pagination.limit,
    20,
  );
  // Verify data structure
  TestValidator.predicate(
    "default page: data should be an array",
    Array.isArray(defaultPageResponse.data),
  );
  // Verify comment summary structure when data exists
  if (defaultPageResponse.data.length > 0) {
    const comment = defaultPageResponse.data[0];
    TestValidator.equals("comment has id", typeof comment.id, "string");
    TestValidator.equals(
      "comment has content",
      typeof comment.content,
      "string",
    );
    TestValidator.equals(
      "comment has created_at",
      typeof comment.created_at,
      "string",
    );
    TestValidator.equals(
      "comment has updated_at",
      typeof comment.updated_at,
      "string",
    );
    TestValidator.equals(
      "comment has author with id",
      typeof comment.author.id,
      "string",
    );
    TestValidator.equals(
      "comment has author with display_name",
      typeof comment.author.display_name,
      "string",
    );
  }
  // Test second page (should be empty or have fewer results)
  const secondPageRequest = {
    content: "Test content",
    page: 2,
    limit: 20,
  } satisfies IDiscussionBoardComment.IRequest;
  const secondPageResponse =
    await api.functional.discussionBoard.articles.comments.index(
      testConnection,
      {
        articleId: testArticleId,
        body: secondPageRequest,
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "second page: current should be 2",
    secondPageResponse.pagination.current,
    2,
  );
  // Test with limit parameter
  const smallLimitRequest = {
    content: "Test content",
    page: 1,
    limit: 2,
  } satisfies IDiscussionBoardComment.IRequest;
  const smallLimitResponse =
    await api.functional.discussionBoard.articles.comments.index(
      testConnection,
      {
        articleId: testArticleId,
        body: smallLimitRequest,
      },
    );
  typia.assert(smallLimitResponse);
  TestValidator.equals(
    "small limit: limit should be 2",
    smallLimitResponse.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "small limit: data length should not exceed limit",
    smallLimitResponse.data.length <= 2,
  );
}
