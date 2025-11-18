import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test registration fails with invalid email format.
 *
 * Scenario:
 *
 * - Attempt user registration with an email that is not valid RFC 5322 format
 *   (e.g., missing '@', invalid domain, etc.)
 * - All other required registration fields (password, display_name, href,
 *   referrer) are valid.
 * - Expect API to reject request with validation error (not type error!)
 * - Validate that user is not created and API responds with a clear error.
 *
 * Steps:
 *
 * 1. Prepare registration body with invalid email (e.g., 'invalid-email-format').
 * 2. Supply valid password, display_name, href, referrer.
 * 3. Call POST /auth/user/join.
 * 4. Assert that TestValidator.error triggers (API rejects registration).
 * 5. (Optional) Validate error message is appropriate.
 */
export async function test_api_user_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // 1. Prepare invalid registration payload
  const requestBody = {
    email: "not-an-email", // Not a valid RFC 5322 email
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ITodoListUser.IJoin;

  // 2. Attempt registration and expect failure
  await TestValidator.error(
    "user registration fails with invalid email format",
    async () => {
      await api.functional.auth.user.join(connection, { body: requestBody });
    },
  );
}
