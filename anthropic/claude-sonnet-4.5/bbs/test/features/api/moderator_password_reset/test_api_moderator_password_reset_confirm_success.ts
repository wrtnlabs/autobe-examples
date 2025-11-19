import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test password reset request and basic authentication workflow.
 *
 * This test validates the moderator password reset request process:
 *
 * 1. Creates a moderator account with an initial password
 * 2. Verifies login works with the initial password
 * 3. Requests a password reset to generate a secure token
 * 4. Validates the password reset request completes successfully
 *
 * Note: This test cannot verify the complete reset confirmation workflow
 * because the reset token is sent via email and not accessible in the test. A
 * complete integration test would require access to the token generation system
 * or database to retrieve the actual reset token.
 *
 * The test ensures:
 *
 * - Moderator account creation works correctly
 * - Initial password authentication succeeds
 * - Password reset request is accepted for valid moderator emails
 * - The system properly handles the reset request flow
 */
export async function test_api_moderator_password_reset_confirm_success(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with initial password
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitialPass123!" satisfies string &
    tags.MinLength<8>;

  const joinBody = {
    email: moderatorEmail,
    password: initialPassword,
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: "https://test.example.com/moderator/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://test.example.com/home" satisfies string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinBody,
    });
  typia.assert(createdModerator);

  TestValidator.equals(
    "created moderator email matches input",
    createdModerator.email,
    moderatorEmail,
  );

  // Step 2: Verify login works with initial password
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const loginResult: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(unauthConn, {
      body: {
        email: moderatorEmail,
        password: initialPassword,
        href: "https://test.example.com/moderator/login" satisfies string &
          tags.Format<"uri">,
        referrer: "https://test.example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(loginResult);

  TestValidator.equals(
    "login moderator ID matches created moderator",
    loginResult.id,
    createdModerator.id,
  );

  // Step 3: Request password reset to generate token
  await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
    connection,
    {
      body: {
        email: moderatorEmail,
      } satisfies IDiscussionBoardModerator.IRequestPasswordReset,
    },
  );

  // Password reset request completed successfully (void return indicates success)
  // The reset token has been generated and sent to the moderator's email
  // In a production environment, the moderator would receive the token via email
  // and use it to complete the password reset through the confirmation endpoint
}
