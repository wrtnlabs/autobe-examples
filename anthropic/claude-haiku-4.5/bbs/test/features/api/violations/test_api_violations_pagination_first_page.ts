import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentViolationRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentViolationRecord";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentViolationRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentViolationRecord";

/**
 * Test retrieving first page of violation records with pagination.
 *
 * This test validates pagination functionality by requesting the first page of
 * violation records from the moderation API. A moderator is created and
 * authenticated, then queries violation records with explicit pagination
 * parameters (page=1, limit=20).
 *
 * The test verifies:
 *
 * 1. First page is returned when page=1 is requested
 * 2. Pagination metadata is correct (current page, limit, total records, total
 *    pages)
 * 3. Response contains the expected number of violation records
 * 4. Pagination current value equals 1
 *
 * Workflow:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Request violations list with page=1 and limit=20
 * 3. Validate response structure and pagination metadata
 * 4. Confirm first page is returned with proper pagination info
 */
export async function test_api_violations_pagination_first_page(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "SecurePass123!",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Request violation records with first page parameters
  const violationPage: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(violationPage);

  // Step 3: Validate pagination structure and first page data
  TestValidator.equals(
    "pagination current page should be 1",
    violationPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should be 20",
    violationPage.pagination.limit,
    20,
  );

  TestValidator.predicate(
    "pagination total records should be non-negative",
    violationPage.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination total pages should be non-negative",
    violationPage.pagination.pages >= 0,
  );

  // Step 4: Validate data array length matches expectations
  const expectedLength = Math.min(violationPage.pagination.records, 20);
  TestValidator.equals(
    "violation records array length should match expected",
    violationPage.data.length,
    expectedLength,
  );

  // Step 5: Validate each violation record structure
  if (violationPage.data.length > 0) {
    const firstViolation = violationPage.data[0];
    typia.assert<IDiscussionBoardContentViolationRecord.ISummary>(
      firstViolation,
    );
  }
}
