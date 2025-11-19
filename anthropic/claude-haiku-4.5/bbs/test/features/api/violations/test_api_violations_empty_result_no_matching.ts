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

export async function test_api_violations_empty_result_no_matching(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request violations with filters that match no records
  // Using a future date range to ensure no violations are found
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  const violationRequest = {
    page: 1,
    limit: 20,
    date_from: new Date().toISOString(),
    date_to: futureDate.toISOString(),
  } satisfies IDiscussionBoardContentViolationRecord.IRequest;

  const emptyResult: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: violationRequest,
      },
    );
  typia.assert(emptyResult);

  // Step 3: Validate that data array is empty
  TestValidator.equals(
    "violation data array should be empty",
    emptyResult.data.length,
    0,
  );

  // Step 4: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination should have valid structure",
    emptyResult.pagination !== null &&
      emptyResult.pagination !== undefined &&
      typeof emptyResult.pagination === "object",
  );

  // Step 5: Validate pagination metadata values for empty results
  TestValidator.equals(
    "pagination records should be zero",
    emptyResult.pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination pages should be zero",
    emptyResult.pagination.pages,
    0,
  );

  TestValidator.equals(
    "pagination current page should be 1",
    emptyResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should match request",
    emptyResult.pagination.limit,
    20,
  );

  // Step 6: Verify all pagination fields are non-negative integers
  TestValidator.predicate(
    "pagination current should be non-negative",
    emptyResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be non-negative",
    emptyResult.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    emptyResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    emptyResult.pagination.pages >= 0,
  );
}
