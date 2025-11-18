import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_password_reset_confirm_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = typia.random<
    string &
      tags.MinLength<8> &
      tags.Pattern<"^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).*$">
  >();

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: originalPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registeredUser);
  TestValidator.equals(
    "user created with correct email",
    registeredUser.email,
    userEmail,
  );

  // Step 2: Initiate password reset request
  const resetResponse =
    await api.functional.auth.user.password.reset_request.resetPasswordRequest(
      connection,
      {
        body: {
          email: userEmail,
        } satisfies ITodoListUser.IPasswordResetRequest,
      },
    );
  typia.assert(resetResponse);
  TestValidator.predicate(
    "reset request returns success message",
    resetResponse.message.length > 0,
  );

  // Step 3: Prepare new password meeting security requirements
  // Password must have: uppercase, lowercase, digit, special character, min 8 chars
  const newPassword =
    "NewSecure" +
    RandomGenerator.alphabets(3).toUpperCase() +
    RandomGenerator.alphaNumeric(2) +
    "@" +
    RandomGenerator.alphabets(2);

  // Step 4: Confirm password reset with token and new password
  // Note: In production, the token would come from the email sent by reset-request
  // For testing, we generate a properly formatted token
  const resetToken = RandomGenerator.alphaNumeric(32);

  const resetConfirmResponse =
    await api.functional.auth.user.password.reset_confirm.resetPasswordConfirm(
      connection,
      {
        body: {
          token: resetToken,
          new_password: newPassword,
        } satisfies ITodoListUser.IPasswordResetConfirm,
      },
    );
  typia.assert(resetConfirmResponse);
  TestValidator.equals(
    "reset confirmation returns correct user ID",
    resetConfirmResponse.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "reset confirmation returns correct email",
    resetConfirmResponse.email,
    userEmail,
  );
  TestValidator.predicate(
    "sessions were invalidated after password reset",
    resetConfirmResponse.sessions_invalidated === true,
  );
  TestValidator.predicate(
    "reset completed message is present",
    resetConfirmResponse.message.length > 0,
  );
  TestValidator.predicate(
    "reset completed timestamp is present",
    resetConfirmResponse.reset_completed_at.length > 0,
  );
}
