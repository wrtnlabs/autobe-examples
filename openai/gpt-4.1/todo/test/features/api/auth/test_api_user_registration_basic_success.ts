import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the basic user registration process for the Todo List API.
 *
 * This test verifies two primary scenarios:
 *
 * 1. A new user can successfully register using a unique email (format-validated)
 *    and a password (8-72 chars), and receives a valid response with
 *    authentication tokens. The response structure and types are fully
 *    validated.
 * 2. Attempting to register again with the same email results in an error, as
 *    duplicate emails are not allowed (uniqueness constraint is enforced at
 *    API/DB level).
 *
 * Steps:
 *
 * 1. Generate a random, valid email and password.
 * 2. Make a POST request to /auth/user/join with these credentials and expect a
 *    successful authorized user response with tokens. Use typia.assert for
 *    schema correctness.
 * 3. Make a second POST to /auth/user/join with the exact same email and password,
 *    and expect an error (using TestValidator.error), confirming the API's
 *    duplicate registration prevention.
 */
export async function test_api_user_registration_basic_success(
  connection: api.IConnection,
) {
  // Step 1: Generate random credentials (email and password)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // length between 8 and 72

  // Step 2: Register user
  const authResponse = await api.functional.auth.user.join(connection, {
    body: { email, password } satisfies ITodoListUser.IJoin,
  });
  typia.assert(authResponse); // Full DTO validation

  // Step 3: Attempt duplicate registration, expect error
  await TestValidator.error(
    "registering with duplicate email must fail",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: { email, password } satisfies ITodoListUser.IJoin,
      });
    },
  );
}
