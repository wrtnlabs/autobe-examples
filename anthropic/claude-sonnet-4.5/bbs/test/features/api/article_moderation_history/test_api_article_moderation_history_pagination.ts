import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Test pagination controls for article moderation history retrieval.
 *
 * This test validates that moderators can navigate through large moderation
 * histories using page and limit parameters. It verifies correct pagination
 * behavior including:
 *
 * - Retrieving specific pages (page 1, 2, 3, etc.)
 * - Controlling page size with limit parameter (testing various limits up to
 *   maximum 100)
 * - Verifying pagination metadata accuracy (current page, total records, total
 *   pages, limit)
 * - Ensuring pagination works correctly and page boundaries are respected
 *
 * Test Steps:
 *
 * 1. Register and authenticate a moderator account
 * 2. Generate a test article ID for moderation history queries
 * 3. Test default pagination behavior (no explicit parameters)
 * 4. Test specific page number retrieval (pages 1, 2, 3)
 * 5. Test various limit values (5, 20, 50, 100 items per page)
 * 6. Validate pagination metadata structure and consistency
 * 7. Verify page boundaries are correctly enforced
 */
export async function test_api_article_moderation_history_pagination(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecureModeratorPass123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
      display_name: RandomGenerator.name(2),
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Generate test article ID for pagination queries
  const testArticleId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Test default pagination (no explicit page or limit)
  const defaultPagination =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {} satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(defaultPagination);
  TestValidator.predicate(
    "default pagination response has valid structure",
    defaultPagination.pagination !== null &&
      defaultPagination.pagination !== undefined,
  );
  TestValidator.predicate(
    "default pagination data is array",
    Array.isArray(defaultPagination.data),
  );

  // Step 4: Test specific page number retrieval
  const page1Result =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals(
    "page 1 current page is 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit is 20", page1Result.pagination.limit, 20);

  const page2Result =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          page: 2,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 current page is 2",
    page2Result.pagination.current,
    2,
  );

  const page3Result =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          page: 3,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(page3Result);
  TestValidator.equals(
    "page 3 current page is 3",
    page3Result.pagination.current,
    3,
  );

  // Step 5: Test various limit values
  const limitTests = [5, 20, 50, 100];

  for (const limitValue of limitTests) {
    const limitResult =
      await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
        connection,
        {
          articleId: testArticleId,
          body: {
            page: 1,
            limit: limitValue,
          } satisfies IDiscussionBoardModerationLog.IRequest,
        },
      );
    typia.assert(limitResult);
    TestValidator.equals(
      `limit ${limitValue} is correctly set in pagination metadata`,
      limitResult.pagination.limit,
      limitValue,
    );
    TestValidator.predicate(
      `data array length does not exceed limit ${limitValue}`,
      limitResult.data.length <= limitValue,
    );
  }

  // Step 6: Validate pagination metadata consistency
  const metadataTest =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(metadataTest);

  // Verify pagination metadata structure
  TestValidator.predicate(
    "pagination current is non-negative",
    metadataTest.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    metadataTest.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    metadataTest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    metadataTest.pagination.pages >= 0,
  );

  // Verify pagination calculation consistency
  const expectedPages =
    metadataTest.pagination.limit > 0
      ? Math.ceil(
          metadataTest.pagination.records / metadataTest.pagination.limit,
        )
      : 0;
  TestValidator.equals(
    "total pages calculation is correct",
    metadataTest.pagination.pages,
    expectedPages,
  );

  // Step 7: Test pagination with filters (ensure pagination works with filtering)
  const filteredPagination =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          page: 1,
          limit: 15,
          action_types: ["article_edited", "article_deleted"],
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(filteredPagination);
  TestValidator.equals(
    "filtered pagination current page is 1",
    filteredPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered pagination limit is 15",
    filteredPagination.pagination.limit,
    15,
  );
}
