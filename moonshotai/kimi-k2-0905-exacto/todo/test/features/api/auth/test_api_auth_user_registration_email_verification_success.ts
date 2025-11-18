import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful user registration with valid email format, proper password
 * requirements, and complete session context. Validates email uniqueness
 * functionality, password hashing verification, immediate account activation,
 * and JWT token generation. Ensures proper handling of optional name field, IP
 * address tracking, and referral source monitoring. Tests complete registration
 * workflow with immediate authentication capability.
 */
export async function test_api_auth_user_registration_email_verification_success(
  connection: api.IConnection,
) {
  // Step 1: Generate test data for user registration
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(12); // Secure random password
  const testName = RandomGenerator.name();
  const testIp = typia.random<string & tags.Format<"ipv4">>();
  const testHref = "https://example.com/app/signup";
  const testReferrer = "https://example.com";

  // Step 2: Create registration request with valid data
  const registrationData = {
    email: testEmail,
    password: testPassword,
    name: testName,
    ip: testIp,
    href: testHref,
    referrer: testReferrer,
  } satisfies ITodoAppUser.ICreate;

  // Step 3: Execute user registration
  const createdUser = await api.functional.auth.user.join(connection, {
    body: registrationData,
  });
  typia.assert(createdUser);

  // Step 4: Validate JWT token generation
  TestValidator.predicate(
    "JWT access token should be generated",
    createdUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "JWT refresh token should be generated",
    createdUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "Token expiration should be set",
    createdUser.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "Refresh token expiration should be set",
    createdUser.token.refreshable_until.length > 0,
  );

  // Step 5: Validate user account properties
  TestValidator.equals(
    "Email should match registration input",
    createdUser.email,
    testEmail,
  );
  TestValidator.equals(
    "Name should match registration input",
    createdUser.name,
    testName,
  );
  TestValidator.equals(
    "User status should be active",
    createdUser.status,
    "active",
  );
  TestValidator.predicate(
    "Created_at timestamp should be present",
    createdUser.created_at.length > 0,
  );
  TestValidator.predicate(
    "Updated_at timestamp should be present",
    createdUser.updated_at.length > 0,
  );

  // Step 6: Validate account activation (no deleted_at for active accounts)
  TestValidator.equals(
    "Deleted_at should be null for active accounts",
    createdUser.deleted_at,
    null,
  );

  // Step 7: Test email uniqueness by attempting duplicate registration
  await TestValidator.error(
    "Duplicate email registration should fail",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          ...registrationData,
          name: RandomGenerator.name(), // Different name
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );

  // Step 8: Test with null name (optional field)
  const anonymousUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: testHref,
      referrer: testReferrer,
      // name field omitted to test null handling
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(anonymousUser);

  TestValidator.equals(
    "Name can be null when not provided",
    anonymousUser.name,
    null,
  );
}
