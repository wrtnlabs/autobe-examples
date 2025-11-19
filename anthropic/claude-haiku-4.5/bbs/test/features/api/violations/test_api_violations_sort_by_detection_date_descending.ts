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
 * Test sorting violation records by detection date in descending order.
 *
 * Validates that the moderation violations endpoint correctly sorts violation
 * records by detection_date in descending order (most recent first), which is
 * the default sorting for active moderation monitoring. Moderators use this
 * default sorting to focus on the latest enforcement activity and track recent
 * policy violations across the platform.
 *
 * The test flow:
 *
 * 1. Create a new moderator account through the join endpoint
 * 2. Request violations list with explicit order_by='detection_date' and
 *    order_direction='desc'
 * 3. Validate that violations are sorted by detected_at in descending order
 * 4. Confirm pagination metadata structure and values
 * 5. Verify violation record structure with contributor and moderator details
 */
export async function test_api_violations_sort_by_detection_date_descending(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword =
    RandomGenerator.alphabets(8) +
    RandomGenerator.alphabets(1).toUpperCase() +
    "1!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphabets(6),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request violations list with explicit descending sort by detection_date
  const violationsResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "detection_date",
          order_direction: "desc",
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(violationsResponse);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    violationsResponse.pagination &&
      typeof violationsResponse.pagination.current === "number" &&
      typeof violationsResponse.pagination.limit === "number" &&
      typeof violationsResponse.pagination.records === "number" &&
      typeof violationsResponse.pagination.pages === "number",
  );

  // Step 4: Validate that violations are sorted in descending order by detected_at
  if (violationsResponse.data.length > 1) {
    for (let i = 0; i < violationsResponse.data.length - 1; i++) {
      const currentViolation = violationsResponse.data[i];
      const nextViolation = violationsResponse.data[i + 1];

      const currentDate = new Date(currentViolation.detected_at).getTime();
      const nextDate = new Date(nextViolation.detected_at).getTime();

      TestValidator.predicate(
        `violation at index ${i} should have detected_at >= next violation detected_at for descending sort`,
        currentDate >= nextDate,
      );
    }
  }

  // Step 5: Validate violation record structure
  if (violationsResponse.data.length > 0) {
    const firstViolation = violationsResponse.data[0];

    TestValidator.predicate(
      "violation should have id",
      typeof firstViolation.id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          firstViolation.id,
        ),
    );

    TestValidator.predicate(
      "violation should have violation_type",
      typeof firstViolation.violation_type === "string" &&
        firstViolation.violation_type.length > 0,
    );

    TestValidator.predicate(
      "violation should have severity",
      typeof firstViolation.severity === "string",
    );

    TestValidator.predicate(
      "violation should have violation_description",
      typeof firstViolation.violation_description === "string" &&
        firstViolation.violation_description.length > 0,
    );

    TestValidator.predicate(
      "violation should have action_taken",
      typeof firstViolation.action_taken === "string",
    );

    TestValidator.predicate(
      "violation should have detected_at timestamp",
      typeof firstViolation.detected_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstViolation.detected_at),
    );

    TestValidator.predicate(
      "violation should have contributor",
      firstViolation.contributor &&
        typeof firstViolation.contributor.id === "string" &&
        typeof firstViolation.contributor.username === "string",
    );

    TestValidator.predicate(
      "violation should have moderator",
      firstViolation.moderator &&
        typeof firstViolation.moderator.id === "string" &&
        typeof firstViolation.moderator.username === "string",
    );

    TestValidator.predicate(
      "violation should have created_at timestamp",
      typeof firstViolation.created_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstViolation.created_at),
    );
  }

  // Step 6: Validate response data is array
  TestValidator.predicate(
    "response data should be array",
    Array.isArray(violationsResponse.data),
  );
}
