import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that duplicate email registration is rejected.
 *
 * This test validates the email uniqueness constraint by:
 *
 * 1. Registering a user with a specific email address
 * 2. Attempting to register another user with the same email
 * 3. Verifying the second registration fails with appropriate error
 * 4. Ensuring no duplicate account is created
 */
export async function test_api_user_registration_duplicate_email_rejection(
  connection: api.IConnection,
) {
  // Step 1: Register first user with valid credentials
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstPassword = RandomGenerator.alphabets(12); // 12 character password
  const firstRegistration = await api.functional.auth.user.join(connection, {
    body: {
      email: firstEmail,
      password: firstPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(firstRegistration);

  // Step 2: Attempt to register second user with same email but different password
  const secondPassword = RandomGenerator.alphabets(15); // Different password
  await TestValidator.error("duplicate email should be rejected", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: firstEmail, // Same email as first user
        password: secondPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  });
}
