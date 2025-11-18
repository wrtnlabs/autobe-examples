import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test registration failure when attempting to register with an email that
 * already exists in the system. Validates email uniqueness constraint
 * enforcement and appropriate error messaging to prevent duplicate account
 * creation.
 */
export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate a unique email address for testing
  const email = typia.random<string & tags.Format<"email">>();

  // Create first user registration with valid data
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: email,
      password: "TestPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(firstUser);

  // Verify first registration was successful
  TestValidator.equals("first user email matches", firstUser.email, email);
  TestValidator.predicate(
    "first user has valid token",
    firstUser.token.access.length > 0,
  );

  // Attempt to register second user with the same email address
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      return await api.functional.auth.user.join(connection, {
        body: {
          email: email,
          password: "AnotherPassword456",
          name: RandomGenerator.name(),
          href: "https://example.com/register",
          referrer: "https://example.com",
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );
}
