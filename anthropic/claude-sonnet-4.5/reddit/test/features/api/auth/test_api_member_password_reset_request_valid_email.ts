import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test password reset request for registered member account.
 *
 * This test validates the complete password reset request workflow:
 *
 * 1. Create a member account with registration
 * 2. Request password reset using the registered email
 * 3. Verify generic success response (security requirement)
 * 4. Test multiple reset requests for the same account
 *
 * Security: Response must not reveal whether email exists to prevent
 * enumeration.
 */
export async function test_api_member_password_reset_request_valid_email(
  connection: api.IConnection,
) {
  // Step 1: Create a member account through registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const registeredMember = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(registeredMember);

  // Step 2: Request password reset using registered email
  const resetResponse =
    await api.functional.auth.member.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IRedditLikeMember.IRequestPasswordReset,
      },
    );
  typia.assert(resetResponse);

  // Step 3: Verify response structure and security requirements
  TestValidator.equals(
    "reset request success flag should be true",
    resetResponse.success,
    true,
  );

  TestValidator.predicate(
    "reset response should contain generic message",
    typeof resetResponse.message === "string" &&
      resetResponse.message.length > 0,
  );

  // Step 4: Test multiple reset requests for same account
  const secondResetResponse =
    await api.functional.auth.member.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IRedditLikeMember.IRequestPasswordReset,
      },
    );
  typia.assert(secondResetResponse);

  TestValidator.equals(
    "second reset request should also succeed",
    secondResetResponse.success,
    true,
  );

  TestValidator.predicate(
    "second reset response should contain message",
    typeof secondResetResponse.message === "string" &&
      secondResetResponse.message.length > 0,
  );

  // Step 5: Test reset request with non-existent email (security test)
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const nonExistentResetResponse =
    await api.functional.auth.member.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies IRedditLikeMember.IRequestPasswordReset,
      },
    );
  typia.assert(nonExistentResetResponse);

  // Verify generic response doesn't reveal email existence
  TestValidator.equals(
    "non-existent email should also return success",
    nonExistentResetResponse.success,
    true,
  );

  TestValidator.predicate(
    "non-existent email response should be generic",
    typeof nonExistentResetResponse.message === "string" &&
      nonExistentResetResponse.message.length > 0,
  );
}
