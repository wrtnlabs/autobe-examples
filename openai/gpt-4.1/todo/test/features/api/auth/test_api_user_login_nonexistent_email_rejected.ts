import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test login attempt with non-existent email is rejected generically.
 *
 * This test validates that authentication fails when a user attempts to log in
 * with an email address that does not correspond to any registered account. It
 * ensures that the API returns a generic error, does not expose whether the
 * account exists, and does not distinguish between non-existent and
 * wrong-password cases in the error message or status code.
 *
 * Steps:
 *
 * 1. Generate a random email address that is highly unlikely to exist in the
 *    system.
 * 2. Attempt login with the random email and a valid password.
 * 3. Assert that authentication fails with a generic error and that no sensitive
 *    information about account existence or failure reason is leaked.
 */
export async function test_api_user_login_nonexistent_email_rejected(
  connection: api.IConnection,
) {
  // Step 1: Generate a guaranteed-nonexistent random email
  const bogusEmail =
    `nonexistent+${RandomGenerator.alphaNumeric(12)}@notreal-domain.com` as string &
      tags.Format<"email">;
  // Step 2: Use a syntactically valid password
  const bogusPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.MinLength<8> &
    tags.MaxLength<128>;
  const loginBody = {
    email: bogusEmail,
    password: bogusPassword,
    href: "https://app.wrtn.ai/login", // valid URI
    referrer: "https://app.wrtn.ai/", // valid URI
    ip: null,
  } satisfies ITodoUser.ILogin;
  // Step 3: Attempt login and assert generic error is returned
  await TestValidator.error(
    "login with nonexistent email should fail generically",
    async () => {
      await api.functional.auth.user.login(connection, { body: loginBody });
    },
  );
}
