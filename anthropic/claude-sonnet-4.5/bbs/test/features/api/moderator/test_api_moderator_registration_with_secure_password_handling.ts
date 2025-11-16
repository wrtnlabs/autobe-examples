import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test secure password handling during moderator registration.
 *
 * This test validates that the moderator registration endpoint follows password
 * security best practices:
 *
 * 1. Registers a new moderator account with a known password
 * 2. Verifies the registration response does NOT expose the password
 * 3. Confirms the response contains expected moderator details and JWT tokens
 * 4. Validates that the moderator account is created successfully with proper data
 *
 * The test ensures passwords are never returned in API responses, which
 * indicates they are being properly hashed and stored securely on the backend.
 * While we cannot directly verify the hashing algorithm used (internal
 * implementation detail), we can verify that passwords are not exposed through
 * the API surface.
 */
export async function test_api_moderator_registration_with_secure_password_handling(
  connection: api.IConnection,
) {
  // Generate registration data with a known password
  const testPassword = "SecureTestPassword123!";
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: testPassword,
    username: RandomGenerator.name(1),
    ip: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  // Register the moderator account
  const registeredModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: registrationData,
    },
  );
  typia.assert(registeredModerator);

  // Verify business logic: username and email match input
  TestValidator.equals(
    "registered username matches input",
    registeredModerator.username,
    registrationData.username,
  );

  TestValidator.equals(
    "registered email matches input",
    registeredModerator.email,
    registrationData.email,
  );

  // CRITICAL SECURITY CHECK: Verify password is NOT in the response
  TestValidator.predicate(
    "password is not exposed in registration response",
    !("password" in registeredModerator),
  );
}
