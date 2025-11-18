import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test registration failure scenarios with valid email formats. Validates
 * business logic errors rather than type validation.
 */
export async function test_api_user_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Create a valid user first to test duplicate email scenario
  const validEmail = typia.random<string & tags.Format<"email">>();

  const validUser = await api.functional.auth.user.join(connection, {
    body: {
      email: validEmail,
      password: "ValidPassword123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(validUser);

  // Test duplicate email registration - this should fail due to business logic
  await TestValidator.error(
    "registration should fail with duplicate email",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: validEmail, // Same email as existing user
          password: "DifferentPassword456!",
          name: RandomGenerator.name(),
          href: "https://example.com/register",
          referrer: "https://example.com",
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );

  // Test with another valid email to ensure the API works correctly
  const anotherValidEmail = typia.random<string & tags.Format<"email">>();
  const anotherUser = await api.functional.auth.user.join(connection, {
    body: {
      email: anotherValidEmail,
      password: "AnotherPassword789!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(anotherUser);

  // Verify both users were created successfully
  TestValidator.equals("first user email matches", validUser.email, validEmail);
  TestValidator.equals(
    "second user email matches",
    anotherUser.email,
    anotherValidEmail,
  );
  TestValidator.notEquals(
    "user IDs should be different",
    validUser.id,
    anotherUser.id,
  );
}
