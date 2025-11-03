import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserWarning";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserWarning";

/**
 * Test that moderators can search and filter user warnings by severity level to
 * prioritize review of serious violations.
 *
 * This scenario validates the filtering capability that enables moderators to
 * focus on severe warnings when making enforcement decisions.
 *
 * The test creates a moderator account, authenticates, creates a member who
 * will receive warnings, then issues multiple warnings with different severity
 * levels (minor, moderate, severe). The search endpoint is then queried with
 * severity filters to verify correct filtering behavior.
 *
 * Validation points include:
 *
 * - Warnings with different severity levels are created successfully
 * - Search with severity filter returns only matching warnings
 * - Severe warnings are correctly identified and returned
 * - Pagination works correctly with filtered results
 * - Response includes complete warning information for each severity level
 */
export async function test_api_warning_search_by_severity_level(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a member account that will receive warnings
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.discussionBoard.members.create(
    connection,
    {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // Step 3: Create warnings with different severity levels
  const severities = ["minor", "moderate", "severe"] as const;
  const createdWarnings: IDiscussionBoardUserWarning[] = [];

  for (const severity of severities) {
    const warning =
      await api.functional.discussionBoard.moderator.moderation.warnings.create(
        connection,
        {
          body: {
            discussion_board_member_id: member.id,
            warning_reason: `${severity}_violation`,
            warning_details: `This is a ${severity} severity warning for testing purposes. The member violated community guidelines.`,
            severity: severity,
          } satisfies IDiscussionBoardUserWarning.ICreate,
        },
      );
    typia.assert(warning);
    createdWarnings.push(warning);
  }

  // Step 4: Search for severe warnings only
  const severeWarningsResult =
    await api.functional.discussionBoard.moderator.moderation.warnings.index(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          severity: "severe",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserWarning.IRequest,
      },
    );
  typia.assert(severeWarningsResult);

  // Validate severe warnings search results
  TestValidator.equals(
    "severe warnings search should return exactly 1 warning",
    severeWarningsResult.data.length,
    1,
  );
  TestValidator.equals(
    "returned warning should have severe severity",
    severeWarningsResult.data[0].severity,
    "severe",
  );
  TestValidator.equals(
    "severe warning reason should match",
    severeWarningsResult.data[0].warning_reason,
    "severe_violation",
  );

  // Step 5: Search for moderate warnings
  const moderateWarningsResult =
    await api.functional.discussionBoard.moderator.moderation.warnings.index(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          severity: "moderate",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserWarning.IRequest,
      },
    );
  typia.assert(moderateWarningsResult);

  TestValidator.equals(
    "moderate warnings search should return exactly 1 warning",
    moderateWarningsResult.data.length,
    1,
  );
  TestValidator.equals(
    "returned warning should have moderate severity",
    moderateWarningsResult.data[0].severity,
    "moderate",
  );

  // Step 6: Search for minor warnings
  const minorWarningsResult =
    await api.functional.discussionBoard.moderator.moderation.warnings.index(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          severity: "minor",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserWarning.IRequest,
      },
    );
  typia.assert(minorWarningsResult);

  TestValidator.equals(
    "minor warnings search should return exactly 1 warning",
    minorWarningsResult.data.length,
    1,
  );
  TestValidator.equals(
    "returned warning should have minor severity",
    minorWarningsResult.data[0].severity,
    "minor",
  );

  // Step 7: Search all warnings for the member without severity filter
  const allWarningsResult =
    await api.functional.discussionBoard.moderator.moderation.warnings.index(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserWarning.IRequest,
      },
    );
  typia.assert(allWarningsResult);

  TestValidator.equals(
    "all warnings search should return 3 warnings",
    allWarningsResult.data.length,
    3,
  );
  TestValidator.equals(
    "pagination total records should be 3",
    allWarningsResult.pagination.records,
    3,
  );

  // Step 8: Validate response completeness - check that each warning has complete information
  for (const warningData of allWarningsResult.data) {
    TestValidator.predicate(
      "warning should have issuing moderator information",
      warningData.issuing_moderator.id === moderator.id,
    );
    TestValidator.predicate(
      "warning should have warned member information",
      warningData.warnedUser.id === member.id,
    );
    TestValidator.predicate(
      "warning should have created timestamp",
      warningData.created_at.length > 0,
    );
    TestValidator.predicate(
      "warning should have updated timestamp",
      warningData.updated_at.length > 0,
    );
  }
}
