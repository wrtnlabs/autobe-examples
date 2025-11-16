import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

/**
 * Test pagination limit boundaries and maximum page size for moderator content
 * reports.
 *
 * Moderator authenticates and tests the content reports endpoint with various
 * limit values to validate pagination constraints. Tests include:
 *
 * - Minimum limit boundary (limit=1)
 * - Typical limit values (limit=10, 25, 50)
 * - Maximum limit boundary (limit=100)
 * - Exceeding maximum limit (limit=101)
 * - Pagination calculations with different limits
 * - Multi-page pagination with different limits
 *
 * The test verifies that the API enforces maximum limit of 100, correctly
 * clamps or rejects exceeded limits, and accurately calculates total pages
 * across various pagination configurations.
 */
export async function test_api_content_reports_pagination_limit_boundary(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorized = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(authorized);
  TestValidator.predicate(
    "moderator authenticated successfully",
    authorized.token.access.length > 0,
  );

  // Step 2: Test minimum limit boundary (limit=1)
  const responseMinLimit =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(responseMinLimit);
  TestValidator.predicate(
    "minimum limit returns valid response with at most 1 item",
    responseMinLimit.data.length <= 1,
  );
  TestValidator.equals(
    "pagination limit is exactly 1 for minimum boundary",
    responseMinLimit.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    responseMinLimit.pagination.current === 1,
  );

  // Step 3: Test typical limit value (limit=10)
  const responseLimit10 =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(responseLimit10);
  TestValidator.predicate(
    "limit 10 returns valid response with at most 10 items",
    responseLimit10.data.length <= 10,
  );
  TestValidator.equals(
    "pagination limit is exactly 10",
    responseLimit10.pagination.limit,
    10,
  );

  // Step 4: Test typical limit value (limit=25)
  const responseLimit25 =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(responseLimit25);
  TestValidator.predicate(
    "limit 25 returns valid response with at most 25 items",
    responseLimit25.data.length <= 25,
  );
  TestValidator.equals(
    "pagination limit is exactly 25",
    responseLimit25.pagination.limit,
    25,
  );

  // Step 5: Test typical limit value (limit=50)
  const responseLimit50 =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(responseLimit50);
  TestValidator.predicate(
    "limit 50 returns valid response with at most 50 items",
    responseLimit50.data.length <= 50,
  );
  TestValidator.equals(
    "pagination limit is exactly 50",
    responseLimit50.pagination.limit,
    50,
  );

  // Step 6: Test maximum limit boundary (limit=100)
  const responseMaxLimit =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(responseMaxLimit);
  TestValidator.predicate(
    "maximum limit returns valid response with at most 100 items",
    responseMaxLimit.data.length <= 100,
  );
  TestValidator.equals(
    "pagination limit is exactly 100 at maximum boundary",
    responseMaxLimit.pagination.limit,
    100,
  );

  // Step 7: Test exceeding maximum limit (limit=101) - should be clamped or handled gracefully
  const responseExceedLimit =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 101,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(responseExceedLimit);
  TestValidator.predicate(
    "exceeded limit is clamped to maximum or handled gracefully",
    responseExceedLimit.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "exceeded limit response contains valid data",
    responseExceedLimit.data.length <= responseExceedLimit.pagination.limit,
  );

  // Step 8: Verify pagination calculations are accurate
  TestValidator.predicate(
    "pagination current page is positive",
    responseMaxLimit.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination records total is non-negative",
    responseMaxLimit.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages total is non-negative",
    responseMaxLimit.pagination.pages >= 0,
  );

  // Step 9: Verify pages calculation accuracy
  const expectedPages = Math.ceil(
    responseMaxLimit.pagination.records / responseMaxLimit.pagination.limit,
  );
  TestValidator.equals(
    "calculated total pages matches API response",
    responseMaxLimit.pagination.pages,
    expectedPages,
  );

  // Step 10: Test multi-page pagination with different limits
  if (responseMaxLimit.pagination.pages > 1) {
    const responseSecondPage =
      await api.functional.discussionBoard.moderator.moderation.content_reports.index(
        connection,
        {
          body: {
            page: 2,
            limit: 50,
          } satisfies IDiscussionBoardReport.IRequest,
        },
      );
    typia.assert(responseSecondPage);
    TestValidator.equals(
      "second page pagination current is 2",
      responseSecondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit matches request",
      responseSecondPage.pagination.limit,
      50,
    );
  }

  // Step 11: Verify response data structure is consistent
  TestValidator.predicate(
    "all responses have valid report structure",
    responseMaxLimit.data.every(
      (report) =>
        report.id && report.reason && report.status && report.created_at,
    ),
  );
  TestValidator.predicate(
    "pagination response structure is complete",
    responseMaxLimit.pagination.limit > 0 &&
      responseMaxLimit.pagination.current > 0 &&
      responseMaxLimit.pagination.records >= 0 &&
      responseMaxLimit.pagination.pages >= 0,
  );
}
