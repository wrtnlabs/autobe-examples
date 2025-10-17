import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test password reset request workflow for member accounts.
 *
 * This test validates the password reset request functionality by creating a
 * member account and requesting a password reset. The system should accept the
 * reset request for a valid registered email and return a success
 * confirmation.
 *
 * Note: The original scenario requested testing token expiration validation,
 * but this is not implementable with the available API because:
 *
 * - Reset tokens are sent via email and not returned in API responses
 * - No test utilities exist to retrieve tokens or manipulate expiration times
 * - No database access is available to modify token timestamps
 *
 * Instead, this test validates the implementable parts of the password reset
 * workflow: creating an account and successfully requesting a password reset.
 *
 * Workflow:
 *
 * 1. Create a new member account with valid credentials
 * 2. Request a password reset for the registered email
 * 3. Verify the reset request is accepted and returns success
 */
export async function test_api_member_password_reset_token_expiration_validation(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);
  TestValidator.equals(
    "member created successfully",
    typeof member.id,
    "string",
  );
  TestValidator.equals("member email matches", member.email, memberEmail);

  // Step 2: Request password reset for the registered email
  const resetRequest =
    await api.functional.auth.member.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IRedditLikeMember.IRequestPasswordReset,
      },
    );
  typia.assert(resetRequest);

  // Step 3: Verify the reset request was successful
  TestValidator.equals("reset request success", resetRequest.success, true);
  TestValidator.equals(
    "reset request message exists",
    typeof resetRequest.message,
    "string",
  );
}
