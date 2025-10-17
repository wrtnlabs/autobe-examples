import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSession";

/**
 * Test that an authenticated member can retrieve their own active session list
 * after logging in.
 *
 * This test validates the complete workflow from member registration through
 * login to session retrieval. It ensures that:
 *
 * 1. Member registration creates an initial authenticated session
 * 2. The member can retrieve their session list using the sessions API
 * 3. At least one active session exists (the current login session)
 * 4. Session metadata includes device_type, browser_info, ip_address, and login
 *    timestamp
 * 5. Session list is properly paginated
 * 6. Authorization prevents accessing other users' sessions (userId matches
 *    authenticated user)
 */
export async function test_api_member_sessions_retrieval_with_active_login(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account to create a fresh user context
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureP@ss123",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  // Step 2: Retrieve the member's session list using the sessions API
  const sessionRequest = {
    is_active: true,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSession.IRequest;

  const sessionPage: IPageIDiscussionBoardSession =
    await api.functional.discussionBoard.member.users.sessions.index(
      connection,
      {
        userId: authorizedMember.id,
        body: sessionRequest,
      },
    );
  typia.assert(sessionPage);

  // Step 3: Validate that at least one active session is returned
  TestValidator.predicate(
    "at least one active session exists",
    sessionPage.data.length >= 1,
  );

  // Step 4: Verify session metadata includes required fields
  const currentSession = sessionPage.data[0];

  // Verify device_type is populated
  TestValidator.predicate(
    "device_type is populated",
    typeof currentSession.device_type === "string" &&
      currentSession.device_type.length > 0,
  );

  // Verify browser_info is populated
  TestValidator.predicate(
    "browser_info is populated",
    typeof currentSession.browser_info === "string" &&
      currentSession.browser_info.length > 0,
  );

  // Verify ip_address is populated
  TestValidator.predicate(
    "ip_address is populated",
    typeof currentSession.ip_address === "string" &&
      currentSession.ip_address.length > 0,
  );

  // Verify the session is active
  TestValidator.equals("session is active", currentSession.is_active, true);

  // Verify session belongs to the created member
  if (
    currentSession.discussion_board_member_id !== null &&
    currentSession.discussion_board_member_id !== undefined
  ) {
    TestValidator.equals(
      "session belongs to authenticated member",
      currentSession.discussion_board_member_id,
      authorizedMember.id,
    );
  }

  // Step 5: Confirm the session list is properly paginated
  TestValidator.predicate(
    "pagination current page is correct",
    sessionPage.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit is correct",
    sessionPage.pagination.limit === 10,
  );

  TestValidator.predicate(
    "pagination records count is valid",
    sessionPage.pagination.records >= 1,
  );

  // Step 6: Validate that the member can only access their own sessions
  TestValidator.predicate(
    "all sessions belong to authenticated user",
    sessionPage.data.every(
      (session) => session.discussion_board_member_id === authorizedMember.id,
    ),
  );
}
