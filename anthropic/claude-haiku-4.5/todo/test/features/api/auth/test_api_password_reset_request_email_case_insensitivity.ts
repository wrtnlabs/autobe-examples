import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password reset request with email case-insensitivity.
 *
 * Verifies that password reset requests work correctly regardless of the case
 * variation of the email address. The test creates a user account with a
 * specific email address, then submits multiple password reset requests using
 * the same email in different case variations (lowercase, uppercase, mixed
 * case).
 *
 * Each request should succeed and return the generic success message,
 * confirming that the backend treats email matching as case-insensitive. This
 * is important for user experience, as users may type their email in different
 * ways when requesting a password reset.
 *
 * 1. Create a new user account with a specific email address
 * 2. Submit password reset request using original email (lowercase)
 * 3. Submit password reset request using uppercase email variation
 * 4. Submit password reset request using mixed case email variation
 * 5. Verify all requests return success response
 */
export async function test_api_password_reset_request_email_case_insensitivity(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with a specific email
  const baseEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: baseEmail,
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Submit password reset request with lowercase email (original)
  const lowercaseResponse =
    await api.functional.auth.user.password.reset_request.resetPasswordRequest(
      connection,
      {
        body: {
          email: baseEmail.toLowerCase(),
        } satisfies ITodoListUser.IPasswordResetRequest,
      },
    );
  typia.assert(lowercaseResponse);
  TestValidator.predicate(
    "lowercase email reset request returns success message",
    lowercaseResponse.message !== undefined &&
      lowercaseResponse.message.length > 0,
  );

  // Step 3: Submit password reset request with uppercase email
  const uppercaseResponse =
    await api.functional.auth.user.password.reset_request.resetPasswordRequest(
      connection,
      {
        body: {
          email: baseEmail.toUpperCase(),
        } satisfies ITodoListUser.IPasswordResetRequest,
      },
    );
  typia.assert(uppercaseResponse);
  TestValidator.predicate(
    "uppercase email reset request returns success message",
    uppercaseResponse.message !== undefined &&
      uppercaseResponse.message.length > 0,
  );

  // Step 4: Submit password reset request with mixed case email
  const mixedCaseEmail = ArrayUtil.repeat(baseEmail.length, (index) => {
    const char = baseEmail[index];
    if (char === undefined) return "";
    return index % 2 === 0 ? char.toUpperCase() : char.toLowerCase();
  }).join("");

  const mixedCaseResponse =
    await api.functional.auth.user.password.reset_request.resetPasswordRequest(
      connection,
      {
        body: {
          email: mixedCaseEmail,
        } satisfies ITodoListUser.IPasswordResetRequest,
      },
    );
  typia.assert(mixedCaseResponse);
  TestValidator.predicate(
    "mixed case email reset request returns success message",
    mixedCaseResponse.message !== undefined &&
      mixedCaseResponse.message.length > 0,
  );

  // Step 5: Verify all responses return the same generic success message
  TestValidator.equals(
    "all reset requests return same success message",
    lowercaseResponse.message,
    uppercaseResponse.message,
  );
  TestValidator.equals(
    "all reset requests return same success message",
    lowercaseResponse.message,
    mixedCaseResponse.message,
  );
}
