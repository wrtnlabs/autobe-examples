import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentReport";

/**
 * Test retrieving report history for a member who has never submitted any
 * reports.
 *
 * This test validates the API's graceful handling of empty result sets when
 * querying content report history. It verifies that:
 *
 * 1. The API returns a successful response (not an error) for members with no
 *    reports
 * 2. The response contains an empty data array
 * 3. Pagination metadata correctly reflects zero records and zero pages
 * 4. The response structure conforms to the expected schema
 *
 * Workflow:
 *
 * 1. Create moderator account with authentication
 * 2. Create member account without any reporting activity
 * 3. Authenticate as moderator to access moderation endpoints
 * 4. Query the member's report history
 * 5. Validate empty result set with correct pagination structure
 */
export async function test_api_member_report_history_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for accessing report history endpoints
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: typia.random<string & tags.Format<"password">>(),
      username: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account with no reporting activity
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: typia.random<string & tags.Format<"password">>(),
      username: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Authenticate as moderator (connection headers already set from moderator join)
  // The moderator.join() call automatically sets the Authorization header

  // Step 4: Query the member's report history with default pagination
  const reportHistory =
    await api.functional.discussionBoard.moderator.members.reports.index(
      connection,
      {
        memberId: member.id,
        body: {} satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(reportHistory);

  // Step 5: Validate empty result set structure
  TestValidator.equals(
    "report history data should be empty array",
    reportHistory.data,
    [],
  );

  // Validate pagination metadata for empty results
  TestValidator.equals(
    "pagination current page should be 1",
    reportHistory.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination total records should be 0",
    reportHistory.pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination total pages should be 0",
    reportHistory.pagination.pages,
    0,
  );

  TestValidator.predicate(
    "pagination limit should be positive number",
    reportHistory.pagination.limit > 0,
  );
}
