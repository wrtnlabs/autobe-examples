import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test member session termination by owner - validates logout functionality.
 *
 * This test verifies that a member can successfully terminate their own active
 * authentication session, effectively logging out from a specific device or
 * browser.
 *
 * Note: This test demonstrates the session termination API structure. In a real
 * scenario, the session ID would be obtained from a session listing endpoint or
 * stored during the login process. Since the join response doesn't include
 * session details, we use a generated session ID to demonstrate the API call
 * pattern.
 *
 * Test workflow:
 *
 * 1. Create a new member account via join (establishes initial session)
 * 2. Terminate a session using DELETE endpoint (demonstrates the API)
 * 3. Verify session termination response structure
 */
export async function test_api_member_session_termination_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create member account and establish initial session
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: RandomGenerator.alphaNumeric(
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<30>
      >(),
    ),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  // Verify member was created successfully
  TestValidator.equals(
    "member email matches registration",
    authorizedMember.email,
    memberData.email,
  );
  TestValidator.equals(
    "member username matches registration",
    authorizedMember.username,
    memberData.username,
  );
  TestValidator.predicate(
    "JWT access token is present",
    authorizedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "JWT refresh token is present",
    authorizedMember.token.refresh.length > 0,
  );

  // Step 2: Terminate the session
  // Using a generated session ID to demonstrate the API call structure
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const terminatedSession: IDiscussionBoardMemberSession =
    await api.functional.discussionBoard.member.members.sessions.erase(
      connection,
      {
        memberId: authorizedMember.id,
        sessionId: sessionId,
      },
    );
  typia.assert(terminatedSession);

  // Step 3: Verify session termination response
  TestValidator.equals(
    "terminated session ID matches",
    terminatedSession.id,
    sessionId,
  );
  TestValidator.equals(
    "session belongs to correct member",
    terminatedSession.discussion_board_member_id,
    authorizedMember.id,
  );
  TestValidator.predicate(
    "session has expired_at timestamp",
    terminatedSession.expired_at !== null &&
      terminatedSession.expired_at !== undefined,
  );

  // Step 4: Verify session metadata is preserved for audit trail
  TestValidator.predicate(
    "session IP is preserved",
    terminatedSession.ip.length > 0,
  );
  TestValidator.equals(
    "session member reference matches",
    terminatedSession.member.id,
    authorizedMember.id,
  );
}
