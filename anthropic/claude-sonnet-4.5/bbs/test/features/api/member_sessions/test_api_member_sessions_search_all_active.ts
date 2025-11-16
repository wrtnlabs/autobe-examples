import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberSession";

/**
 * Test retrieving all active member sessions without filters.
 *
 * This test validates the session listing functionality for security
 * monitoring. Members need to view their currently active login sessions across
 * devices to identify unauthorized access and monitor account security.
 *
 * Test Flow:
 *
 * 1. Create a new member account via join (establishes initial session)
 * 2. Search for active sessions using expired_at_is_null=true filter
 * 3. Verify response contains pagination metadata
 * 4. Confirm the newly created session appears in results
 * 5. Validate session data includes member info, IP, URLs, timestamps
 * 6. Verify expired_at is null (confirming active session status)
 */
export async function test_api_member_sessions_search_all_active(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account and establish initial authentication session
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.name();

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: memberUsername,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });

  typia.assert(authorizedMember);

  // Step 2: Search for all active sessions (expired_at_is_null=true)
  const sessionSearchResult: IPageIDiscussionBoardMemberSession.ISummary =
    await api.functional.discussionBoard.member.members.sessions.index(
      connection,
      {
        memberId: authorizedMember.id,
        body: {
          expired_at_is_null: true,
        } satisfies IDiscussionBoardMemberSession.IRequest,
      },
    );

  typia.assert(sessionSearchResult);

  // Step 3: Validate the data array contains at least the newly created session
  TestValidator.predicate(
    "session data array is not empty",
    sessionSearchResult.data.length > 0,
  );

  // Step 4: Find the session and validate business logic
  const sessionRecord = sessionSearchResult.data[0];

  TestValidator.equals(
    "session member ID matches",
    sessionRecord.discussion_board_member_id,
    authorizedMember.id,
  );

  TestValidator.equals(
    "session member username matches",
    sessionRecord.member.username,
    authorizedMember.username,
  );

  TestValidator.equals(
    "session member email matches",
    sessionRecord.member.email,
    authorizedMember.email,
  );

  // Step 5: CRITICAL VALIDATION - Verify expired_at is null (active session)
  TestValidator.predicate(
    "active session has null expired_at field",
    sessionRecord.expired_at === null || sessionRecord.expired_at === undefined,
  );

  // Additional validation: all returned sessions should be active
  TestValidator.predicate(
    "all sessions in result are active (expired_at is null)",
    sessionSearchResult.data.every(
      (session) =>
        session.expired_at === null || session.expired_at === undefined,
    ),
  );
}
