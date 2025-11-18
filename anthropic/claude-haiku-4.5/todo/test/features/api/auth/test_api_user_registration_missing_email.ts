import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that email field is mandatory during user registration.
 *
 * Validates that the user registration endpoint properly enforces the email
 * field as a required input. This test attempts to register a new user without
 * providing an email address and verifies that the system correctly rejects the
 * registration request with an appropriate error response.
 *
 * Email is critical for user authentication and account identification, serving
 * as the unique identifier for user accounts. The API must validate that email
 * is always provided during registration.
 *
 * Test steps:
 *
 * 1. Prepare registration data with all required fields except email
 * 2. Attempt to submit the registration request to /auth/user/join endpoint
 * 3. Verify that the API rejects the request (email is mandatory)
 * 4. Confirm that no account creation occurs without valid email
 */
export async function test_api_user_registration_missing_email(
  connection: api.IConnection,
) {
  // Prepare registration data without email field
  const registrationData = {
    password: RandomGenerator.alphabets(10),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    user_agent: RandomGenerator.alphabets(8),
    // email field intentionally omitted to test validation
  } satisfies Omit<ITodoListUser.ICreate, "email">;

  // Attempt registration without email - should fail
  await TestValidator.error(
    "registration without email should fail",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: registrationData as any,
      });
    },
  );
}
