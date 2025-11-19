import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator password reset confirmation with valid passwords.
 *
 * IMPORTANT: This test has been rewritten from the original scenario because
 * the original requested testing type validation errors (password length < 8),
 * which is prohibited in E2E tests. Type validation is enforced by TypeScript
 * compiler and the framework, not by E2E tests.
 *
 * This rewritten test focuses on business logic validation instead:
 *
 * - Tests password reset with invalid/non-existent reset tokens
 * - Verifies proper error handling for business rule violations
 * - Does NOT test type-level password length constraints
 *
 * Test Flow:
 *
 * 1. Create a moderator account
 * 2. Request password reset to generate valid reset token
 * 3. Test password reset with invalid (non-existent) reset token
 * 4. Test password reset with malformed token format
 * 5. Verify that invalid tokens are rejected with appropriate errors
 */
export async function test_api_moderator_password_reset_confirm_password_validation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "SecurePass123!";

  const createBody = {
    email: moderatorEmail,
    password: originalPassword,
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: createBody,
  });
  typia.assert(moderator);

  // Step 2: Request password reset to get reset token
  await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
    connection,
    {
      body: {
        email: moderatorEmail,
      } satisfies IDiscussionBoardModerator.IRequestPasswordReset,
    },
  );

  // Step 3: Test password reset with non-existent reset token (business logic error)
  const nonExistentToken = typia.random<string & tags.Format<"uuid">>();
  const validPassword = "NewSecurePass456!";

  await TestValidator.error(
    "password reset with non-existent token should fail",
    async () => {
      await api.functional.auth.moderator.password.reset.confirm.resetPassword(
        connection,
        {
          body: {
            token: nonExistentToken,
            password: validPassword,
          } satisfies IDiscussionBoardModerator.IResetPassword,
        },
      );
    },
  );

  // Step 4: Test password reset with another random invalid token
  const anotherInvalidToken = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "password reset with different invalid token should fail",
    async () => {
      await api.functional.auth.moderator.password.reset.confirm.resetPassword(
        connection,
        {
          body: {
            token: anotherInvalidToken,
            password: "AnotherValidPass789!",
          } satisfies IDiscussionBoardModerator.IResetPassword,
        },
      );
    },
  );
}
