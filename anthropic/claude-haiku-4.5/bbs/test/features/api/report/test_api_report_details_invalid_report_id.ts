import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Test error handling when moderator attempts to retrieve a report with an
 * invalid or nonexistent reportId.
 *
 * This test validates the API's error handling for missing resources:
 *
 * 1. Moderator creates account and authenticates
 * 2. Moderator attempts to retrieve a report using a non-existent UUID
 * 3. Verifies that a 404 Not Found error is returned
 *
 * This ensures the moderation system correctly rejects requests for reports
 * that don't exist in the database.
 */
export async function test_api_report_details_invalid_report_id(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Attempt to retrieve a report with a non-existent UUID
  // Using a valid UUID format but one that doesn't exist in the system
  const invalidReportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Verify that 404 error is returned for non-existent report
  await TestValidator.error(
    "should return 404 for non-existent report",
    async () => {
      await api.functional.discussionBoard.moderator.reports.at(connection, {
        reportId: invalidReportId,
      });
    },
  );
}
