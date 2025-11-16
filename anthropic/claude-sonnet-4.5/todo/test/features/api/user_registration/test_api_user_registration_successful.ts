import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful user account registration workflow.
 *
 * This test validates the complete user registration process including:
 *
 * 1. Creating a new user account with valid email and password credentials
 * 2. Providing connection metadata (href, referrer) for session tracking
 * 3. Receiving JWT authentication tokens immediately upon registration
 * 4. Verifying the response contains complete user profile information
 * 5. Confirming email_verified status is initially false
 * 6. Validating token structure with proper expiration times
 *
 * The registration endpoint creates both the user record and initial session,
 * enabling immediate authenticated access without requiring a separate login
 * step.
 */
export async function test_api_user_registration_successful(
  connection: api.IConnection,
) {
  // Step 1: Generate random valid registration credentials
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  // Step 2: Call user registration API
  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate complete response structure (validates ALL types including formats)
  typia.assert(registeredUser);

  // Step 4: Verify business logic - registered email matches input
  TestValidator.equals(
    "registered email matches input",
    registeredUser.email,
    registrationData.email,
  );

  // Step 5: Verify business logic - email_verified should be false for new users
  TestValidator.predicate(
    "email_verified should be false initially",
    registeredUser.email_verified === false,
  );

  // Step 6: Verify business logic - deleted_at should be null for active new user
  TestValidator.equals(
    "deleted_at should be null for new user",
    registeredUser.deleted_at,
    null,
  );
}
