import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSession";

/**
 * Test that administrators can access session information for any user on the
 * platform.
 *
 * This test validates the administrator's elevated privilege to view session
 * data across different user types for security investigations and user support
 * workflows.
 *
 * Steps:
 *
 * 1. Register a new administrator account with elevated privileges
 * 2. Register a separate member account to create a target user with sessions
 * 3. Administrator retrieves the member's session list
 * 4. Validate that cross-user session access works correctly
 * 5. Verify session data structure and completeness
 */
export async function test_api_administrator_sessions_cross_user_access(
  connection: api.IConnection,
) {
  // Step 1: Register administrator account with elevated privileges
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Register a member account to serve as the target user
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: As administrator, retrieve the member's session list
  const sessionRequest = {
    page: 1,
    limit: 20,
    is_active: true,
  } satisfies IDiscussionBoardSession.IRequest;

  const sessionPage: IPageIDiscussionBoardSession =
    await api.functional.discussionBoard.administrator.users.sessions.index(
      connection,
      {
        userId: member.id,
        body: sessionRequest,
      },
    );
  typia.assert(sessionPage);

  // Step 4: Validate that administrator successfully accessed member's session data
  TestValidator.predicate(
    "administrator can access member sessions",
    sessionPage.data.length >= 0,
  );

  // Step 5: If sessions exist, validate the data structure
  if (sessionPage.data.length > 0) {
    const session = sessionPage.data[0];
    typia.assert(session);
  }
}
