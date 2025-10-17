import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test password reset request and response workflow.
 *
 * This test validates the password reset request functionality by creating a
 * member account and requesting a password reset. While the full session
 * invalidation workflow cannot be tested without access to the actual reset
 * token (sent via email) and session verification endpoints, this test ensures
 * that the password reset request mechanism works correctly and returns
 * appropriate responses.
 *
 * Note: Complete password reset testing (token validation and session
 * invalidation) requires access to the email system to extract reset tokens and
 * authenticated endpoints to verify session status, which are not available in
 * this test environment.
 *
 * Workflow:
 *
 * 1. Create a new member account with valid credentials
 * 2. Request password reset for the member's email address
 * 3. Verify that the password reset request returns a success response
 * 4. Validate the response message indicates the request was processed
 */
export async function test_api_member_password_reset_session_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = typia.random<string & tags.MinLength<8>>();

  const registrationBody = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: memberEmail,
    password: originalPassword,
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(member);

  TestValidator.equals(
    "member should be created with valid email",
    member.email,
    memberEmail,
  );

  // Step 2: Request password reset for the member's email
  const resetRequestBody = {
    email: memberEmail,
  } satisfies IRedditLikeMember.IRequestPasswordReset;

  const resetRequested: IRedditLikeMember.IPasswordResetRequested =
    await api.functional.auth.member.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert(resetRequested);

  // Step 3: Verify password reset request success
  TestValidator.equals(
    "password reset request should succeed",
    resetRequested.success,
    true,
  );

  // Step 4: Validate response message exists and is meaningful
  TestValidator.predicate(
    "reset request message should be provided",
    resetRequested.message.length > 0,
  );

  // Step 5: Test password reset request for non-existent email (security - no enumeration)
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const resetRequestNonExistent = {
    email: nonExistentEmail,
  } satisfies IRedditLikeMember.IRequestPasswordReset;

  const resetRequestedNonExistent: IRedditLikeMember.IPasswordResetRequested =
    await api.functional.auth.member.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestNonExistent,
      },
    );
  typia.assert(resetRequestedNonExistent);

  // Should still return success to prevent email enumeration
  TestValidator.equals(
    "password reset for non-existent email should also return success",
    resetRequestedNonExistent.success,
    true,
  );
}
