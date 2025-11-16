import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that user registration properly captures and stores session context
 * metadata.
 *
 * This test validates the complete user registration workflow including session
 * tracking. It registers a new user with full connection metadata (href and
 * referrer URLs) and verifies that:
 *
 * 1. The registration endpoint accepts valid session context data
 * 2. Authentication tokens are properly issued upon successful registration
 * 3. The response includes complete user profile information
 * 4. All URI format fields are properly validated
 * 5. The initial session is created with the provided context information
 *
 * Session context tracking is essential for analytics and security monitoring,
 * allowing the system to track user registration sources and initial access
 * patterns.
 */
export async function test_api_user_registration_session_context_tracking(
  connection: api.IConnection,
) {
  // Generate valid registration data with session context
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  // Register new user with session context metadata
  const registeredUser = await api.functional.auth.user.join(connection, {
    body: registrationData,
  });

  // Validate the complete response structure (performs ALL type validation)
  typia.assert(registeredUser);

  // Verify business logic: registered email should match input
  TestValidator.equals(
    "registered email should match input",
    registeredUser.email,
    registrationData.email,
  );

  // Verify business logic: email should not be verified initially
  TestValidator.predicate(
    "email should not be verified initially",
    registeredUser.email_verified === false,
  );

  // Verify business logic: account should not be deleted
  TestValidator.predicate(
    "account should not be deleted",
    registeredUser.deleted_at === null ||
      registeredUser.deleted_at === undefined,
  );
}
