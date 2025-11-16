import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test session lifecycle tracking through member registration and session
 * retrieval.
 *
 * This test validates the session management system by:
 *
 * 1. Creating a new member account which establishes an authentication session
 * 2. Verifying the member registration completed successfully with valid
 *    authentication tokens
 * 3. Testing the session retrieval endpoint to ensure session data can be accessed
 * 4. Validating session state indicators (created_at, expired_at) work correctly
 * 5. Confirming connection context (IP, href, referrer) is properly tracked
 * 6. Ensuring member relationship data is correctly associated with sessions
 *
 * Note: Due to API limitations, we cannot extract the actual session ID from
 * the join response, so this test demonstrates the session retrieval
 * functionality using the available endpoint structure. In a production
 * scenario, there would be a session listing endpoint or the session ID would
 * be included in the join response.
 */
export async function test_api_member_session_lifecycle_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create new member account to establish initial session
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.name();
  const connectionIp = "203.0.113.42";
  const connectionHref = "https://example.com/register";
  const connectionReferrer = "https://example.com/home";

  const joinRequestBody = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    ip: connectionIp,
    href: connectionHref,
    referrer: connectionReferrer,
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(authorizedMember);

  // Step 2: Verify member creation and authentication
  TestValidator.equals(
    "member email matches input",
    authorizedMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "member username matches input",
    authorizedMember.username,
    memberUsername,
  );
  TestValidator.predicate(
    "member account is active",
    authorizedMember.status === "active",
  );
  TestValidator.predicate(
    "access token is present",
    authorizedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    authorizedMember.token.refresh.length > 0,
  );

  // Step 3: Verify token expiration timestamps are in the future
  const accessExpiration = new Date(authorizedMember.token.expired_at);
  const refreshExpiration = new Date(authorizedMember.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate(
    "access token expiration is in future",
    accessExpiration.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token expiration is in future",
    refreshExpiration.getTime() > now.getTime(),
  );

  // Step 4: Test session retrieval endpoint functionality
  // Generate a mock session ID to test the endpoint structure
  // In a real implementation, this would come from a session listing endpoint
  // or be included in the join response
  const mockSessionId = typia.random<string & tags.Format<"uuid">>();

  const session: IDiscussionBoardMemberSession =
    await api.functional.discussionBoard.member.members.sessions.at(
      connection,
      {
        memberId: authorizedMember.id,
        sessionId: mockSessionId,
      },
    );
  typia.assert(session);

  // Step 5: Validate session structure and lifecycle fields
  // Verify expired_at can be null (for active sessions) or a timestamp (for expired sessions)
  TestValidator.predicate(
    "expired_at is either null or valid timestamp",
    session.expired_at === null ||
      session.expired_at === undefined ||
      typeof session.expired_at === "string",
  );

  // Step 6: Verify connection context fields are tracked
  TestValidator.predicate("session has IP address", session.ip.length > 0);
  TestValidator.predicate("session has href", session.href.length > 0);
  TestValidator.predicate("session has referrer", session.referrer.length > 0);

  // Step 7: Validate member relationship data
  TestValidator.predicate(
    "session foreign key matches member",
    session.discussion_board_member_id === authorizedMember.id,
  );
  TestValidator.predicate(
    "session has member summary",
    session.member !== null,
  );
  TestValidator.equals(
    "member summary ID matches",
    session.member.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "member summary username matches",
    session.member.username,
    authorizedMember.username,
  );
  TestValidator.equals(
    "member summary email matches",
    session.member.email,
    authorizedMember.email,
  );

  // Step 8: Verify session timestamps are valid
  const sessionCreatedAt = new Date(session.created_at);
  TestValidator.predicate(
    "session created_at is valid date",
    !isNaN(sessionCreatedAt.getTime()),
  );
}
