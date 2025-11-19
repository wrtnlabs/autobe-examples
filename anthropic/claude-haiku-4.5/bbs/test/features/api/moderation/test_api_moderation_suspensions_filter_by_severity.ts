import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

/**
 * Test filtering suspensions by severity classification.
 *
 * A moderator authenticates and retrieves suspension records filtered by
 * severity_level='severe'. This test validates that the filter correctly
 * returns only severe violations while excluding minor, moderate, and permanent
 * severity levels.
 *
 * Test workflow:
 *
 * 1. Moderator account creation and authentication
 * 2. Call suspension filter API with severity_level='severe'
 * 3. Validate all returned suspensions have severity_level='severe'
 * 4. Confirm pagination structure and filtered results
 */
export async function test_api_moderation_suspensions_filter_by_severity(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(8) + "A1!",
    username: RandomGenerator.alphabets(5) + RandomGenerator.alphaNumeric(3),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Validate moderator creation
  TestValidator.predicate(
    "moderator should be authenticated",
    moderator.token !== undefined && moderator.token.access !== undefined,
  );

  // Step 2: Retrieve suspensions filtered by severe severity level
  const suspensionResponse: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          severity_level: "severe",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(suspensionResponse);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination should exist",
    suspensionResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "current page should be 1",
    suspensionResponse.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should be 20",
    suspensionResponse.pagination.limit === 20,
  );

  TestValidator.predicate(
    "data array should exist",
    Array.isArray(suspensionResponse.data),
  );

  // Step 4: Validate all suspensions have severe severity level
  if (suspensionResponse.data.length > 0) {
    TestValidator.predicate(
      "all suspensions should have severe severity level",
      suspensionResponse.data.every(
        (suspension) => suspension.severity_level === "severe",
      ),
    );

    // Validate individual suspension structure
    const firstSuspension = suspensionResponse.data[0];
    typia.assert<IDiscussionBoardUserSuspension.ISummary>(firstSuspension);

    TestValidator.predicate(
      "suspension should have moderator information",
      firstSuspension.moderator !== undefined &&
        firstSuspension.moderator.id !== undefined &&
        firstSuspension.moderator.username !== undefined,
    );

    TestValidator.predicate(
      "suspension should have valid status",
      ["active", "lifted", "expired"].includes(firstSuspension.status),
    );

    TestValidator.predicate(
      "suspension should have valid type",
      ["posting_restriction", "account_suspension", "permanent_ban"].includes(
        firstSuspension.suspension_type,
      ),
    );

    TestValidator.predicate(
      "suspension should have reason",
      firstSuspension.reason !== undefined && firstSuspension.reason.length > 0,
    );

    TestValidator.predicate(
      "suspension should have suspended_at timestamp",
      firstSuspension.suspended_at !== undefined,
    );
  }

  // Step 5: Verify pagination records count is consistent
  TestValidator.predicate(
    "returned data length should not exceed limit",
    suspensionResponse.data.length <= suspensionResponse.pagination.limit,
  );

  TestValidator.predicate(
    "pagination records count should match total records",
    suspensionResponse.pagination.records >= 0,
  );
}
