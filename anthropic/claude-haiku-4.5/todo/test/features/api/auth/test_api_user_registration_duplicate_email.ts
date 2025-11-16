import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates that the user registration endpoint properly enforces unique email
 * constraint by rejecting duplicate registration attempts.
 *
 * This test ensures the system prevents multiple accounts from being created
 * with the same email address, which is critical for maintaining data integrity
 * and preventing account conflicts.
 *
 * Test flow:
 *
 * 1. Create an initial user account with a specific email address
 *    (user@example.com)
 * 2. Attempt to register a second user using the same email address
 * 3. Verify that the system rejects the duplicate registration with an error
 *    response
 */
export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Create initial user with first email
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: email,
      password: password,
      href: href,
      referrer: referrer,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(firstUser);

  TestValidator.equals(
    "first user email matches registration email",
    firstUser.email,
    email,
  );

  // Step 2: Attempt to register another user with the same email
  // This should fail with an error response
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: email, // Same email as first user
          password: RandomGenerator.alphabets(10), // Different password
          href: href,
          referrer: referrer,
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );
}
