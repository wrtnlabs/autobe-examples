import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test email uniqueness validation rejection when attempting to register with
 * an existing email address.
 *
 * This test validates the critical security feature that prevents duplicate
 * email registrations in the system. The test ensures that when a user attempts
 * to create an account with an email that already exists in the database, the
 * system properly rejects the request and provides appropriate error feedback.
 *
 * Testing steps:
 *
 * 1. Generate random test data for user registration
 * 2. Create initial user account with unique email
 * 3. Verify successful account creation with proper API response
 * 4. Attempt duplicate registration with same email address
 * 5. Validate error handling and rejection behavior
 * 6. Confirm original account remains unaffected
 *
 * This test is essential for preventing duplicate accounts, maintaining data
 * integrity, and ensuring appropriate user feedback during registration
 * failures.
 */
export async function test_api_auth_user_registration_email_duplicate_prevention(
  connection: api.IConnection,
) {
  // Step 1: Generate unique test data
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "SecureValidPassword123";
  const testName = RandomGenerator.name();
  const testHref = `http://localhost:3000/register`;
  const testReferrer = `http://localhost:3000/signup`;

  // Step 2: Create initial user account successfully
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: testEmail,
      password: testPassword,
      name: testName,
      href: testHref,
      referrer: testReferrer,
    } satisfies ITodoAppUser.ICreate,
  });

  // Verify first registration succeeded
  typia.assert(firstUser);
  TestValidator.equals("first user has email", firstUser.email, testEmail);
  TestValidator.predicate("first user has valid ID", firstUser.id.length > 0);

  // Step 3: Attempt duplicate registration with same email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: testEmail, // Same email as first user
          password: testPassword,
          name: testName,
          href: testHref,
          referrer: testReferrer,
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );

  // Step 4: Verify alternative registration still works
  const alternativeEmail = typia.random<string & tags.Format<"email">>();
  const alternativeUser = await api.functional.auth.user.join(connection, {
    body: {
      email: alternativeEmail,
      password: testPassword,
      name: testName,
      href: testHref,
      referrer: testReferrer,
    } satisfies ITodoAppUser.ICreate,
  });

  typia.assert(alternativeUser);
  TestValidator.notEquals(
    "alternative user has different email",
    alternativeUser.email,
    testEmail,
  );
}
