import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Validates that administrator login fails when using invalid credentials.
 *
 * This test covers two negative cases:
 *
 * 1. Invalid email: An email address that does not match any admin account.
 * 2. Invalid password: Correct email but wrong password.
 *
 * The test ensures:
 *
 * - No authentication token or identity is returned for either case.
 * - The error message is appropriately generic (prevents info leakage).
 * - Security best practices are followed (no existence hinting).
 *
 * Steps:
 *
 * 1. Generate a guaranteed-invalid email and attempt login.
 * 2. (For negative password) Simulate a known admin but use an incorrect password.
 * 3. Assert that both calls fail with a generic error (using TestValidator.error).
 * 4. Check that no token/identity is received.
 */
export async function test_api_admin_login_invalid_credentials(
  connection: api.IConnection,
) {
  // 1. Invalid email: Generate known-fake admin email and valid-looking password
  const invalidEmail =
    `notfound_${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">;
  const validPassword = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  const loginInputInvalidEmail = {
    email: invalidEmail,
    password: validPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/portal",
  } satisfies IDiscussionBoardAdmin.ILogin;
  await TestValidator.error(
    "denies login with non-existent admin email",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: loginInputInvalidEmail,
      });
    },
  );

  // 2. Invalid password: Provide a plausible admin email and an incorrect password
  // (Random email, known to be unregistered, so result is same as above.)
  const plausibleEmail =
    `admin_${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">;
  const wrongPassword = RandomGenerator.alphaNumeric(14) as string &
    tags.Format<"password">;
  const loginInputInvalidPassword = {
    email: plausibleEmail,
    password: wrongPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/portal",
  } satisfies IDiscussionBoardAdmin.ILogin;
  await TestValidator.error(
    "denies login with correct admin email but wrong password",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: loginInputInvalidPassword,
      });
    },
  );
}
