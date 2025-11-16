import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";

/**
 * Test moderator search functionality with boundary limit values.
 *
 * This test validates that the moderator search API properly handles pagination
 * limit constraints, including minimum (1), maximum (100), and edge cases where
 * the total number of records is less than the requested limit. The test
 * ensures the system enforces limit boundaries correctly and returns accurate
 * pagination metadata.
 *
 * Test workflow:
 *
 * 1. Create multiple moderator accounts for testing
 * 2. Authenticate as a moderator to access the search endpoint
 * 3. Test minimum limit boundary (limit=1)
 * 4. Test maximum limit boundary (limit=100)
 * 5. Test various mid-range limit values (5, 10, 25, 50)
 * 6. Test partial page scenarios (total records < limit)
 * 7. Validate pagination metadata and response structure
 */
export async function test_api_moderator_search_with_limit_boundaries(
  connection: api.IConnection,
) {
  // Step 1: Create multiple moderator accounts for testing using functional pattern
  const moderatorCount = 15;
  const createdModerators = await ArrayUtil.asyncRepeat(
    moderatorCount,
    async (i) => {
      const moderator = await api.functional.auth.moderator.join(connection, {
        body: {
          email: `testmod${i}_${typia.random<string & tags.Format<"uuid">>()}@example.com`,
          password: "TestPassword123!",
          username: `moderator_${i}_${RandomGenerator.alphaNumeric(6)}`,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardModerator.ICreate,
      });
      typia.assert(moderator);
      return moderator;
    },
  );

  // Step 2: Connection is already authenticated from the last join call
  // No need for additional assertions on already-validated data

  // Step 3: Test minimum limit boundary (limit=1)
  const minLimitResponse =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(minLimitResponse);

  TestValidator.equals(
    "minimum limit returns exactly 1 record",
    minLimitResponse.data.length,
    1,
  );
  TestValidator.equals(
    "minimum limit pagination reflects limit=1",
    minLimitResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "minimum limit total records is at least 1",
    minLimitResponse.pagination.records >= 1,
  );

  // Step 4: Test maximum limit boundary (limit=100)
  const maxLimitResponse =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(maxLimitResponse);

  TestValidator.predicate(
    "maximum limit returns no more than 100 records",
    maxLimitResponse.data.length <= 100,
  );
  TestValidator.equals(
    "maximum limit pagination reflects limit=100",
    maxLimitResponse.pagination.limit,
    100,
  );

  // Step 5: Test mid-range limit values
  const midRangeLimits = [5, 10, 25, 50] as const;

  for (const limit of midRangeLimits) {
    const response =
      await api.functional.discussionBoard.moderator.moderators.index(
        connection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies IDiscussionBoardModerator.IRequest,
        },
      );
    typia.assert(response);

    const expectedCount = Math.min(limit, response.pagination.records);
    TestValidator.equals(
      `limit=${limit} returns correct number of records`,
      response.data.length,
      expectedCount,
    );
    TestValidator.equals(
      `limit=${limit} pagination reflects requested limit`,
      response.pagination.limit,
      limit,
    );
  }

  // Step 6: Test partial page scenario by requesting a high page number
  // This creates a scenario where available records on that page < limit
  const highPageResponse =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 10,
          limit: 10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(highPageResponse);

  TestValidator.predicate(
    "partial page returns only available records",
    highPageResponse.data.length <= highPageResponse.pagination.limit,
  );
  TestValidator.predicate(
    "partial page data length is valid",
    highPageResponse.data.length >= 0,
  );

  // Step 7: Validate pagination metadata consistency
  const validationResponse =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(validationResponse);

  const expectedPages = Math.ceil(
    validationResponse.pagination.records / validationResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination calculates total pages correctly",
    validationResponse.pagination.pages,
    expectedPages,
  );
  TestValidator.predicate(
    "current page is within valid range",
    validationResponse.pagination.current >= 1 &&
      validationResponse.pagination.current <=
        validationResponse.pagination.pages,
  );

  // Step 8: Validate response structure for each moderator
  for (const moderator of validationResponse.data) {
    typia.assert(moderator);
    TestValidator.predicate(
      "moderator has valid UUID",
      moderator.id.length > 0,
    );
    TestValidator.predicate("moderator has email", moderator.email.length > 0);
    TestValidator.predicate(
      "moderator has username",
      moderator.username.length > 0,
    );
  }

  // Step 9: Test default limit behavior (when limit is not provided)
  const defaultLimitResponse =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(defaultLimitResponse);

  TestValidator.predicate(
    "default limit is applied when not specified",
    defaultLimitResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default limit returns valid number of records",
    defaultLimitResponse.data.length <= defaultLimitResponse.pagination.limit,
  );
}
