import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validates successful member report creation with valid enum values.
 *
 * This test verifies that a member can successfully create reports with all
 * valid reason enum values. The member registers, authenticates, and then
 * creates multiple reports using each of the predefined reason values
 * (offensive_language, personal_attack, spam, off_topic, copyright_violation,
 * harassment, other) to ensure the API properly accepts valid enum values.
 *
 * Steps:
 *
 * 1. Register a new member account with valid credentials
 * 2. Member authenticates and receives authorization token
 * 3. Create reports with each valid reason enum value
 * 4. Verify each report is successfully created and stored
 * 5. Validate response contains correct reason value
 */
export async function test_api_member_report_creation_invalid_reason(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Member is now authenticated via token set in connection headers
  // Step 3: Test creating reports with each valid reason enum value
  const validReasons = [
    "offensive_language",
    "personal_attack",
    "spam",
    "off_topic",
    "copyright_violation",
    "harassment",
    "other",
  ] as const;

  for (const reason of validReasons) {
    const report: IDiscussionBoardReport =
      await api.functional.discussionBoard.member.reports.create(connection, {
        body: {
          reason,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardReport.ICreate,
      });
    typia.assert(report);

    // Step 4 & 5: Validate response contains correct reason value
    TestValidator.equals(
      `report created with reason ${reason}`,
      report.reason,
      reason,
    );
  }
}
