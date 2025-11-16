import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test member session security verification workflow.
 *
 * This test validates the member authentication and session retrieval
 * capabilities. Since session IDs are not exposed in the join response, this
 * test focuses on:
 *
 * 1. Creating a new member account with session context data
 * 2. Verifying the authentication response includes proper member identification
 * 3. Demonstrating the session retrieval endpoint usage (using simulated session
 *    ID)
 *
 * Note: In a real implementation, session IDs would be obtained through a
 * session listing endpoint or similar mechanism. This test uses the simulation
 * mode of the SDK to demonstrate the session detail retrieval pattern.
 *
 * Test workflow:
 *
 * 1. Create a new member account via join endpoint with session metadata
 * 2. Verify the authorized member response is valid
 * 3. Retrieve session details using the session endpoint (simulated)
 * 4. Validate session data structure and member ownership
 */
export async function test_api_member_session_security_verification(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account and establish authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const memberUsername = RandomGenerator.name();

  const joinData = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    ip: "192.168.1.100",
    href: "https://discussionboard.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://google.com/search" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinData,
    });
  typia.assert(authorizedMember);

  // Step 2: Verify member identification details
  TestValidator.equals(
    "member email should match registration data",
    authorizedMember.email,
    memberEmail,
  );

  TestValidator.equals(
    "member username should match registration data",
    authorizedMember.username,
    memberUsername,
  );

  // Step 3: Retrieve session details (using generated session ID for demonstration)
  // In production, session ID would be obtained from a session listing endpoint
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const sessionDetails: IDiscussionBoardMemberSession =
    await api.functional.discussionBoard.member.members.sessions.at(
      connection,
      {
        memberId: authorizedMember.id,
        sessionId: sessionId,
      },
    );
  typia.assert(sessionDetails);

  // Step 4: Validate session member ownership
  TestValidator.equals(
    "session member ID should match authorized member",
    sessionDetails.discussion_board_member_id,
    authorizedMember.id,
  );

  TestValidator.equals(
    "session member summary should match authorized member",
    sessionDetails.member.id,
    authorizedMember.id,
  );

  // Step 5: Verify expired_at is null for active session
  TestValidator.equals(
    "active session should have null expired_at",
    sessionDetails.expired_at,
    null,
  );
}
