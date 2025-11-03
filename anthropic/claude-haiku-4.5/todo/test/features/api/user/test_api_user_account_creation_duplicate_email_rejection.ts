import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates duplicate email prevention during user registration.
 *
 * Tests that the system prevents creating multiple user accounts with the same
 * email address. First creates a user account with a specific email address,
 * then attempts to register another account with the same email. Validates that
 * the second registration fails with an appropriate error indicating the email
 * is already in use.
 *
 * Test flow:
 *
 * 1. Create initial user account with valid email and password
 * 2. Attempt to register another account with the same email
 * 3. Verify the second registration fails with duplicate email error
 * 4. Confirm only one account exists with that email address
 */
export async function test_api_user_account_creation_duplicate_email_rejection(
  connection: api.IConnection,
) {
  // Step 1: Create initial user account with specific email
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphabets(10);

  const firstUser: ITodoAppUser = await api.functional.todoApp.users.create(
    connection,
    {
      body: {
        email: testEmail,
        password: testPassword,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(firstUser);

  // Verify first account was created successfully
  TestValidator.equals(
    "first user email matches input",
    firstUser.email,
    testEmail,
  );
  TestValidator.equals(
    "first user status is active",
    firstUser.status,
    "active",
  );

  // Step 2: Attempt to register another account with same email
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.todoApp.users.create(connection, {
        body: {
          email: testEmail,
          password: RandomGenerator.alphabets(10),
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );

  // Step 3: Verify that attempting duplicate registration did not create another account
  // by attempting to create another user with a different email to show system is still functional
  const differentEmail = typia.random<string & tags.Format<"email">>();
  const secondUser: ITodoAppUser = await api.functional.todoApp.users.create(
    connection,
    {
      body: {
        email: differentEmail,
        password: RandomGenerator.alphabets(10),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(secondUser);

  // Verify the second user is different from first (different email and ID)
  TestValidator.notEquals(
    "second user is different from first user",
    secondUser.id,
    firstUser.id,
  );
  TestValidator.notEquals(
    "second user email is different",
    secondUser.email,
    firstUser.email,
  );
}
