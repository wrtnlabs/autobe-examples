import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Tests complete user registration workflow with valid credentials.
 *
 * Validates that a new user can successfully sign up with a valid email and
 * password, and immediately receive authentication tokens without requiring a
 * separate login step.
 *
 * Process:
 *
 * 1. Generate valid registration credentials (email, password, session context)
 * 2. Call the user registration API endpoint
 * 3. Validate the response contains complete user profile and authentication
 *    tokens
 * 4. Verify the returned email matches the input email
 * 5. Confirm the registration completed successfully with proper token generation
 */
export async function test_api_user_registration_with_valid_credentials(
  connection: api.IConnection,
) {
  // Generate valid registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Call the registration API
  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: email,
        password: password,
        href: href,
        referrer: referrer,
      } satisfies ITodoListUser.IRegister,
    });

  // Validate the complete response structure (this validates ALL type requirements)
  typia.assert(registeredUser);

  // Validate business logic: returned email matches input email
  TestValidator.equals(
    "returned email matches input email",
    registeredUser.email,
    email,
  );
}
