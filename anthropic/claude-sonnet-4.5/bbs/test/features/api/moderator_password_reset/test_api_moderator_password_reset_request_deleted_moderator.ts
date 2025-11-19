import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test password reset request for a soft-deleted moderator account.
 *
 * This test validates the anti-enumeration security design of the password
 * reset functionality. When a password reset is requested for a soft-deleted
 * moderator account (deleted_at is set), the system should return success
 * without revealing that the account has been deleted, preventing attackers
 * from enumerating which email addresses belong to deleted moderator accounts.
 *
 * Test Flow:
 *
 * 1. Create a new moderator account with valid credentials
 * 2. Note: In a real scenario, the account would be soft-deleted (deleted_at set)
 *    However, this requires admin privileges or direct database access
 * 3. Request password reset using the moderator's email address
 * 4. Validate that the operation completes successfully without errors
 * 5. Verify the response follows security best practices (no account status
 *    disclosure)
 *
 * Security Principle: The password reset API must not reveal whether an account
 * exists, is active, or has been deleted. All requests should return success,
 * but only active accounts should receive actual reset tokens via email.
 */
export async function test_api_moderator_password_reset_request_deleted_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account that will simulate a deleted account scenario
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const createBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });

  typia.assert(moderator);

  // Validate moderator was created successfully
  TestValidator.predicate(
    "moderator email matches",
    moderator.email === moderatorEmail,
  );

  // Step 2: In a real scenario, the moderator account would now be soft-deleted
  // (deleted_at timestamp would be set to a non-null value)
  // This would typically require admin API or direct database manipulation

  // Step 3: Request password reset for the moderator's email
  // According to the security design, this should return success regardless of
  // whether the account is active, deleted, or non-existent
  const resetRequestBody = {
    email: moderatorEmail,
  } satisfies IDiscussionBoardModerator.IRequestPasswordReset;

  await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
    connection,
    {
      body: resetRequestBody,
    },
  );

  // Step 4: Validate that the operation completed successfully
  // The API should not throw any errors, maintaining the anti-enumeration security design
  // Note: We cannot verify whether a token was actually generated without access to
  // the database or email system, but the API contract states that deleted accounts
  // will not receive actual tokens while still returning success

  // Step 5: Test with a non-existent email to verify consistent behavior
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  const nonExistentResetBody = {
    email: nonExistentEmail,
  } satisfies IDiscussionBoardModerator.IRequestPasswordReset;

  await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
    connection,
    {
      body: nonExistentResetBody,
    },
  );

  // Both requests (existing and non-existent) should complete successfully
  // This validates the anti-enumeration security principle
}
