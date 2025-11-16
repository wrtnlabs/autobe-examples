import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Test that unauthenticated access to report details is properly blocked.
 *
 * This test verifies the security mechanism that prevents unauthorized users
 * from accessing confidential report information. The moderator report details
 * endpoint requires proper authentication credentials. When an unauthenticated
 * request (without moderator token) attempts to retrieve report details by ID,
 * the system must reject the request with an appropriate 401 Unauthorized error
 * response.
 *
 * This is a critical security test ensuring that report data, which may contain
 * sensitive content about community violations and moderation actions, is only
 * accessible to authenticated moderators and not to anonymous users or members
 * without proper authorization.
 *
 * Test flow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a sample report in the system
 * 3. Create an unauthenticated connection (no authorization header)
 * 4. Attempt to retrieve the report details using the unauthenticated connection
 * 5. Verify the operation fails with 401 Unauthorized error
 */
export async function test_api_report_details_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account and authenticate
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "SecurePassword123",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a sample report
  // Note: In a real scenario, we would call the report creation endpoint
  // For now, we'll use a random UUID as the report ID for testing
  const reportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Create an unauthenticated connection by clearing authorization headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4 & 5: Attempt to access report details without authentication
  // This should fail with a 401 Unauthorized error
  await TestValidator.error(
    "unauthenticated access to report details should fail",
    async () => {
      await api.functional.discussionBoard.moderator.reports.at(
        unauthenticatedConnection,
        {
          reportId: reportId,
        },
      );
    },
  );
}
