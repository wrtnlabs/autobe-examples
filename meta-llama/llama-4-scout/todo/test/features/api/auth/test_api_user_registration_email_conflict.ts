import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Verify the registration endpoint blocks duplicate email addresses.
 *
 * This test creates the first user with a unique email, then attempts to
 * register a second user using the same email but a different display name. The
 * test asserts that the first registration is successful, but the second
 * registration fails due to email duplication, confirming proper uniqueness
 * enforcement at the API layer.
 *
 * Steps:
 *
 * 1. Generate a random email and base registration data
 * 2. Register the first user (should succeed)
 * 3. Attempt to register a second user with the same email (should fail)
 */
export async function test_api_user_registration_email_conflict(
  connection: api.IConnection,
) {
  // 1. Prepare a random valid email to ensure global uniqueness for this session
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const displayName1 = RandomGenerator.name();
  const displayName2 = RandomGenerator.name();
  const href = "https://test-client.local/register";
  const referrer = "https://test-client.local/landing";

  // 2. Register the first user with unique email
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      display_name: displayName1,
      href,
      referrer,
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(user1);
  TestValidator.equals("email of registered user matches", user1.email, email);

  // 3. Attempt to register another user with the same email (should fail)
  await TestValidator.error(
    "second registration with duplicate email should fail",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email,
          password: typia.random<string & tags.Format<"password">>(),
          display_name: displayName2,
          href,
          referrer,
        } satisfies ITodoListUser.IJoin,
      });
    },
  );
}
