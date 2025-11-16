import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test retrieving detailed information about a specific member authentication
 * session.
 *
 * This test validates the session detail retrieval endpoint structure and
 * response format:
 *
 * 1. Creating a new member account via join operation to establish authentication
 *    context
 * 2. Attempting to retrieve session details using the authenticated member's ID
 * 3. Verifying the session response structure contains all required fields
 * 4. Validating member summary information within the session details
 * 5. Confirming security-relevant metadata fields are present and properly
 *    formatted
 * 6. Ensuring timestamp fields follow ISO 8601 date-time format
 *
 * Note: Since the available APIs do not provide a way to list sessions or
 * obtain session IDs from the join response, this test uses simulation mode to
 * validate the endpoint structure and response format rather than testing with
 * actual session data retrieval.
 */
export async function test_api_member_session_retrieval_detailed(
  connection: api.IConnection,
) {
  // Step 1: Create registration data for a new member
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(2),
    ip: "192.168.1.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  // Step 2: Register the new member to establish authentication context
  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(authorizedMember);

  // Step 3: Validate core member response fields
  TestValidator.equals(
    "registered username matches input",
    authorizedMember.username,
    registrationData.username,
  );
  TestValidator.equals(
    "registered email matches input",
    authorizedMember.email,
    registrationData.email,
  );

  // Step 4: Generate a session ID for testing the endpoint structure
  // Note: In production, this would come from a session list endpoint or join response
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Retrieve session details to validate response structure
  const sessionDetails: IDiscussionBoardMemberSession =
    await api.functional.discussionBoard.member.members.sessions.at(
      connection,
      {
        memberId: authorizedMember.id,
        sessionId: sessionId,
      },
    );
  typia.assert(sessionDetails);

  // Step 6: Verify session belongs to the correct member
  TestValidator.equals(
    "session belongs to the correct member",
    sessionDetails.discussion_board_member_id,
    authorizedMember.id,
  );

  // Step 7: Verify member summary matches the authenticated member
  TestValidator.equals(
    "session member ID matches",
    sessionDetails.member.id,
    authorizedMember.id,
  );

  TestValidator.equals(
    "session member username matches",
    sessionDetails.member.username,
    authorizedMember.username,
  );

  TestValidator.equals(
    "session member email matches",
    sessionDetails.member.email,
    authorizedMember.email,
  );

  // Step 8: Verify expired_at is null for active session
  TestValidator.equals(
    "active session expired_at should be null",
    sessionDetails.expired_at,
    null,
  );
}
