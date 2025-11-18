import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test guest user registration with duplicate email addresses.
 *
 * This test validates that the guest registration endpoint properly handles
 * duplicate email registration attempts. Since the original scenario requested
 * type validation testing (which violates compilation requirements), this test
 * has been rewritten to test business logic instead.
 *
 * Test Process:
 *
 * 1. Register a guest user successfully with a valid email
 * 2. Attempt to register another guest user with the same email address
 * 3. Verify that the duplicate registration attempt fails
 * 4. Confirm the email uniqueness constraint is enforced
 */
export async function test_api_guest_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Generate valid registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const name = RandomGenerator.name();
  const href = "https://example.com/register";
  const referrer = "https://example.com/home";

  // First registration - should succeed
  const firstGuest = await api.functional.auth.guest.join(connection, {
    body: {
      email: email,
      password: password,
      name: name,
      href: href,
      referrer: referrer,
    } satisfies ITodoListGuest.ICreate,
  });
  typia.assert(firstGuest);

  // Attempt duplicate registration - should fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: email,
          password: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(),
          href: href,
          referrer: referrer,
        } satisfies ITodoListGuest.ICreate,
      });
    },
  );
}
