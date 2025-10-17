import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test multiple password reset requests for the same account.
 *
 * This test validates that the system properly handles multiple password reset
 * requests for the same member account. While we cannot test token reuse
 * directly (since tokens are only sent via email), we can verify that:
 *
 * 1. Multiple reset requests can be initiated for the same account
 * 2. Each request returns a successful confirmation response
 * 3. The system handles concurrent/sequential reset requests appropriately
 *
 * This tests the password reset request workflow and ensures the system doesn't
 * break when users request multiple password resets.
 *
 * Workflow:
 *
 * 1. Create a new member account
 * 2. Request a password reset (first request)
 * 3. Request another password reset for the same account (second request)
 * 4. Request a third password reset to verify multiple requests are handled
 * 5. Verify all requests return successful confirmation responses
 */
export async function test_api_member_password_reset_token_reuse_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: originalPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);
  TestValidator.equals(
    "member created successfully",
    member.email,
    memberEmail,
  );

  // Step 2: Request first password reset
  const resetRequest1 =
    await api.functional.auth.member.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IRedditLikeMember.IRequestPasswordReset,
      },
    );
  typia.assert(resetRequest1);
  TestValidator.equals(
    "first reset request successful",
    resetRequest1.success,
    true,
  );
  TestValidator.predicate(
    "first reset request has confirmation message",
    resetRequest1.message.length > 0,
  );

  // Step 3: Request second password reset for the same account
  const resetRequest2 =
    await api.functional.auth.member.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IRedditLikeMember.IRequestPasswordReset,
      },
    );
  typia.assert(resetRequest2);
  TestValidator.equals(
    "second reset request successful",
    resetRequest2.success,
    true,
  );
  TestValidator.predicate(
    "second reset request has confirmation message",
    resetRequest2.message.length > 0,
  );

  // Step 4: Request third password reset to verify multiple requests are handled
  const resetRequest3 =
    await api.functional.auth.member.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IRedditLikeMember.IRequestPasswordReset,
      },
    );
  typia.assert(resetRequest3);
  TestValidator.equals(
    "third reset request successful",
    resetRequest3.success,
    true,
  );
  TestValidator.predicate(
    "third reset request has confirmation message",
    resetRequest3.message.length > 0,
  );

  // Step 5: Verify response consistency across all requests
  TestValidator.equals(
    "all reset requests return consistent success status",
    resetRequest1.success,
    resetRequest2.success,
  );
  TestValidator.equals(
    "second and third requests also consistent",
    resetRequest2.success,
    resetRequest3.success,
  );
}
