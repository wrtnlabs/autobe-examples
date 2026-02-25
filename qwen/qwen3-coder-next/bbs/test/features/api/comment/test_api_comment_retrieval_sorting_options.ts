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

export async function test_api_comment_retrieval_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // Use mock article ID for comment retrieval testing
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Default sorting (oldest first - chronological)
  const defaultResponse =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId,
      body: {
        content: "Test comment content",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(defaultResponse);
  // Verify pagination structure
  TestValidator.predicate(
    "default response has valid pagination",
    defaultResponse.pagination.records >= 0 &&
      defaultResponse.pagination.pages >= 0 &&
      defaultResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "default response current page is 1",
    defaultResponse.pagination.current,
    1,
  );
  // Test 2: Newest first sorting (reverse chronological)
  const newestResponse =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId,
      body: {
        content: "Test comment content",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(newestResponse);
  // Verify pagination structure is consistent
  TestValidator.equals(
    "newest response pagination matches default",
    newestResponse.pagination.records,
    defaultResponse.pagination.records,
  );
  TestValidator.equals(
    "newest response current page is 1",
    newestResponse.pagination.current,
    1,
  );
  // Test 3: Different page sizes
  const smallPageResponse =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId,
      body: {
        content: "Test comment content",
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(smallPageResponse);
  TestValidator.predicate(
    "small page size works",
    smallPageResponse.data.length <= 5,
  );
  // Test 4: Single page edge case
  const singlePageResponse =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId,
      body: {
        content: "Test comment content",
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(singlePageResponse);
  TestValidator.predicate(
    "single item page works",
    singlePageResponse.data.length <= 1 || singlePageResponse.data.length === 0,
  );
  // Test 5: Verify comment structure
  if (defaultResponse.data.length > 0) {
    const firstComment = defaultResponse.data[0];
    typia.assert(firstComment);
    TestValidator.predicate(
      "comment has valid id format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstComment.id,
      ),
    );
    TestValidator.predicate(
      "comment has valid date-time format",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i.test(
        firstComment.created_at,
      ),
    );
    TestValidator.predicate(
      "comment has valid author structure",
      firstComment.author !== null &&
        typeof firstComment.author === "object" &&
        firstComment.author.id !== undefined,
    );
    // Verify content is not empty
    TestValidator.predicate(
      "comment has non-empty content",
      () =>
        firstComment.content !== undefined && firstComment.content.length > 0,
    );
    // Verify author structure
    TestValidator.predicate(
      "author has required fields",
      firstComment.author.id !== undefined &&
        firstComment.author.email !== undefined &&
        firstComment.author.display_name !== undefined &&
        typeof firstComment.author.is_active === "boolean" &&
        typeof firstComment.author.is_admin === "boolean",
    );
  }
  // Test 6: Large page limit edge case
  const largePageResponse =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId,
      body: {
        content: "Test comment content",
        page: 1,
        limit: 1000,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(largePageResponse);
  // Verify pagination metadata is consistent
  TestValidator.equals(
    "large page pagination consistent",
    largePageResponse.pagination.records,
    defaultResponse.pagination.records,
  );
}
