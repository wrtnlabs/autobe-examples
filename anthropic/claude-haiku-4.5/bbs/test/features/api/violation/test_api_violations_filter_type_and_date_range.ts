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
 * Tests filtering of violation records by type and date range simultaneously.
 *
 * This test validates that the violation API correctly filters records when
 * multiple criteria are applied together. The moderator authenticates, then
 * requests violations of a specific type (harassment) within a specific date
 * range. The system should return only violations matching both criteria.
 *
 * Test workflow:
 *
 * 1. Create and authenticate moderator account
 * 2. Query violations filtered by type='harassment' AND date range
 * 3. Validate all returned records match the harassment type
 * 4. Validate all returned records fall within the specified date range
 * 5. Verify pagination metadata is correct
 */
export async function test_api_violations_filter_type_and_date_range(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(8) + "Aa1!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Define date range for filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFromStr = thirtyDaysAgo.toISOString();
  const dateToStr = now.toISOString();

  // 3. Query violations with type and date range filters
  const violationResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          violation_type: "harassment",
          date_from: dateFromStr,
          date_to: dateToStr,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(violationResponse);

  // 4. Validate response structure
  TestValidator.predicate(
    "response contains pagination data",
    violationResponse.pagination !== undefined &&
      violationResponse.pagination !== null,
  );
  TestValidator.predicate(
    "response data is an array",
    Array.isArray(violationResponse.data),
  );

  // 5. Validate each violation record matches filter criteria
  for (const violation of violationResponse.data) {
    typia.assert(violation);

    // Validate violation type matches filter
    TestValidator.equals(
      "violation type matches harassment filter",
      violation.violation_type,
      "harassment",
    );

    // Validate detected_at is within date range
    const detectedDate = new Date(violation.detected_at);
    TestValidator.predicate(
      "violation detected_at is on or after date_from",
      detectedDate.getTime() >= thirtyDaysAgo.getTime(),
    );

    TestValidator.predicate(
      "violation detected_at is on or before date_to",
      detectedDate.getTime() <= now.getTime(),
    );

    // Validate required fields exist
    TestValidator.predicate(
      "violation has id",
      violation.id !== undefined && violation.id !== null,
    );
    TestValidator.predicate(
      "violation has severity",
      violation.severity !== undefined && violation.severity !== null,
    );
    TestValidator.predicate(
      "violation has action_taken",
      violation.action_taken !== undefined && violation.action_taken !== null,
    );
  }

  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    violationResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 20",
    violationResponse.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    violationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    violationResponse.pagination.pages >= 0,
  );
}
