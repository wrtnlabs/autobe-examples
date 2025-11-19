import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test password reset request workflow.
 *
 * This test validates the password reset request process:
 *
 * 1. Create a member account with an initial password
 * 2. Verify successful login with the initial password
 * 3. Request password reset to generate a reset token
 * 4. Verify the password reset request response
 *
 * Note: The complete password reset flow (token retrieval and password change)
 * cannot be tested in a pure E2E context because:
 *
 * - Reset tokens are sent via email and not returned in API responses
 * - E2E tests cannot access the database or email system to retrieve tokens
 * - This would require integration test capabilities
 *
 * This test focuses on validating the implementable parts of the workflow that
 * can be tested through the available API endpoints.
 */
export async function test_api_password_reset_completion_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with initial password
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitialPassword123!";

  const createdMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: initialPassword,
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(createdMember);
  TestValidator.equals(
    "created member email matches",
    createdMember.email,
    memberEmail,
  );
  TestValidator.predicate(
    "member receives access token",
    createdMember.token.access.length > 0,
  );

  // Step 2: Verify successful login with initial password
  const loginResult = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: initialPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(loginResult);
  TestValidator.equals(
    "login successful with initial password",
    loginResult.email,
    memberEmail,
  );

  // Step 3: Request password reset to generate a reset token
  const resetRequested =
    await api.functional.auth.member.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies IDiscussionBoardMember.IRequestPasswordReset,
      },
    );
  typia.assert(resetRequested);
  TestValidator.predicate(
    "reset request confirmation message exists",
    resetRequested.message.length > 0,
  );
  TestValidator.predicate(
    "reset token has expiration time",
    resetRequested.expires_in_minutes > 0,
  );
  TestValidator.equals(
    "reset token expires in 60 minutes",
    resetRequested.expires_in_minutes,
    60,
  );
}
