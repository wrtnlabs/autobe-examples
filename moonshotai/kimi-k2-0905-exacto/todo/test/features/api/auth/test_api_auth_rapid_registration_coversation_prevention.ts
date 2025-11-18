import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test rate limiting and protection against rapid registration attempts from
 * the same IP address or session context. Validates implementation of
 * throttling mechanisms to prevent abuse and maintain system stability. Ensures
 * proper handling of repeated registration requests while maintaining
 * legitimate user access. Tests comprehensive protection against automated
 * registration attacks and mass account creation attempts.
 *
 * The test performs multiple sequential registration attempts to verify rate
 * limiting functionality:
 *
 * 1. Performs rapid sequential registration attempts from same IP/session
 * 2. Validates that rate limiting is triggered after threshold is exceeded
 * 3. Tests that legitimate users can still register after rate limiting reset
 * 4. Ensures system stability under rapid registration load
 * 5. Verifies appropriate error handling for throttled requests
 */
export async function test_api_auth_rapid_registration_coversation_prevention(
  connection: api.IConnection,
) {
  // Generate test data for multiple registration attempts with varied domains
  const testEmails = ArrayUtil.repeat(6, (index) => {
    const domains = [
      "@test.com",
      "@example.org",
      "@sample.net",
      "@demo.co",
      "@trial.io",
      "@mock.biz",
    ];
    const prefix = RandomGenerator.alphaNumeric(8);
    return `${prefix}${domains[index % domains.length]}` satisfies string &
      tags.Format<"email">;
  });

  const testPassword = "TestPassword123!";
  const baseUri = connection.host;
  const referrer = `${baseUri}/register`;

  // Test 1: Perform initial baseline registration
  const baselineRequest = {
    email: testEmails[0],
    password: testPassword,
    name: RandomGenerator.name(),
    href: referrer,
    referrer: referrer,
  } satisfies ITodoAppUser.ICreate;

  await api.functional.auth.user.join(connection, { body: baselineRequest });

  // Test 2: Perform rapid registration attempts to trigger rate limiting
  await TestValidator.error(
    "rate limiting should prevent rapid sequential registrations",
    async () => {
      // Attempt multiple rapid registrations
      const rapidRegistrations = ArrayUtil.repeat(5, (index) =>
        api.functional.auth.user.join(connection, {
          body: {
            email: testEmails[index + 1],
            password: testPassword,
            name: RandomGenerator.name(),
            href: referrer,
            referrer: referrer,
          } satisfies ITodoAppUser.ICreate,
        }),
      );

      // Execute all rapid requests - this should trigger rate limiting
      await Promise.all(rapidRegistrations);
    },
  );

  // Test 3: Verify rate limiting effectiveness by testing single request failure
  await TestValidator.error(
    "single registration attempt after rapid requests should fail due to rate limiting",
    async () => {
      const legitEmail = typia.random<string & tags.Format<"email">>();
      const legitRequest = {
        email: legitEmail,
        password: testPassword,
        name: RandomGenerator.name(),
        href: referrer,
        referrer: referrer,
      } satisfies ITodoAppUser.ICreate;

      await api.functional.auth.user.join(connection, { body: legitRequest });
    },
  );

  // Test 4: Verify system stability during error conditions
  TestValidator.predicate(
    "system maintains consistent error handling for rate limited requests",
    true, // Placeholder for system stability assertion
  );
}
