import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password reset request for non-existent user email addresses.
 *
 * This test validates that password reset requests return a generic success
 * message even for email addresses that don't exist in the system. This
 * behavior prevents email enumeration attacks where attackers could determine
 * which email addresses are registered by observing different responses.
 *
 * The security principle being tested: deleted and non-existent accounts should
 * receive identical generic success responses, making it impossible for
 * attackers to determine account existence through password reset endpoint
 * behavior.
 *
 * The test flow:
 *
 * 1. Create a legitimate user account
 * 2. Request password reset for that existing user - verify success response
 * 3. Request password reset for a non-existent email address - verify identical
 *    success response
 * 4. Confirm the endpoint doesn't distinguish between existing and non-existing
 *    accounts
 */
export async function test_api_password_reset_request_deleted_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account (represents an active account)
  const existingUserEmail = typia.random<string & tags.Format<"email">>();
  const existingUserPassword = RandomGenerator.alphabets(12);

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: existingUserEmail,
        password: existingUserPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(createdUser);

  TestValidator.equals(
    "user created with active account",
    createdUser.deleted_at,
    null,
  );

  // Step 2: Request password reset for existing active user
  const existingUserResetResponse: ITodoListUser.IPasswordResetRequestResponse =
    await api.functional.auth.user.password.reset_request.resetPasswordRequest(
      connection,
      {
        body: {
          email: existingUserEmail,
        } satisfies ITodoListUser.IPasswordResetRequest,
      },
    );
  typia.assert(existingUserResetResponse);

  TestValidator.predicate(
    "existing user password reset returns success message",
    typeof existingUserResetResponse.message === "string" &&
      existingUserResetResponse.message.length > 0,
  );

  // Step 3: Request password reset for a non-existent email (simulating deleted account scenario)
  // This tests the security principle: deleted accounts should behave like non-existent accounts
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  const nonExistentUserResetResponse: ITodoListUser.IPasswordResetRequestResponse =
    await api.functional.auth.user.password.reset_request.resetPasswordRequest(
      connection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies ITodoListUser.IPasswordResetRequest,
      },
    );
  typia.assert(nonExistentUserResetResponse);

  TestValidator.predicate(
    "non-existent email password reset returns success message",
    typeof nonExistentUserResetResponse.message === "string" &&
      nonExistentUserResetResponse.message.length > 0,
  );

  // Step 4: Verify identical response behavior for both scenarios
  // This prevents email enumeration: attackers cannot distinguish existing vs deleted/non-existent accounts
  TestValidator.equals(
    "password reset returns identical message for all email addresses",
    existingUserResetResponse.message,
    nonExistentUserResetResponse.message,
  );

  // Step 5: Confirm the endpoint's security by message content
  TestValidator.predicate(
    "message is generic and doesn't reveal account status",
    existingUserResetResponse.message.toLowerCase().includes("sent") ||
      existingUserResetResponse.message.toLowerCase().includes("reset") ||
      existingUserResetResponse.message.toLowerCase().includes("link") ||
      existingUserResetResponse.message.toLowerCase().includes("if account"),
  );
}
