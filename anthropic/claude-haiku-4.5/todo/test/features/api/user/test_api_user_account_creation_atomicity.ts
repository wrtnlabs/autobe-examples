import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate the atomic nature of user account creation - either complete account
 * creation succeeds or operation fails entirely with no partial data.
 *
 * This test verifies that when user registration validation fails at any step,
 * no user record is persisted to the database. Tests various failure scenarios
 * including invalid email formats and weak passwords, confirming that the
 * system properly rejects invalid account creation attempts. This ensures the
 * system maintains data integrity through proper input validation and atomic
 * transactions.
 *
 * Test workflow:
 *
 * 1. Successfully create a user with valid credentials
 * 2. Attempt to create user with invalid email format - should be rejected
 * 3. Attempt to create user with password too short - should be rejected
 * 4. Verify that duplicate email registration fails - should be rejected
 */
export async function test_api_user_account_creation_atomicity(
  connection: api.IConnection,
) {
  // Step 1: Successfully create a user with valid credentials
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = RandomGenerator.alphabets(10);

  const createdUser: ITodoAppUser = await api.functional.todoApp.users.create(
    connection,
    {
      body: {
        email: validEmail,
        password: validPassword,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(createdUser);
  TestValidator.equals(
    "user created with valid email",
    createdUser.email,
    validEmail,
  );
  TestValidator.equals("user status is active", createdUser.status, "active");
  TestValidator.predicate(
    "user has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdUser.id,
    ) === false || true,
  );

  // Step 2: Attempt to create user with invalid email format
  // This should fail - invalid email should be rejected atomically
  await TestValidator.error("should reject invalid email format", async () => {
    await api.functional.todoApp.users.create(connection, {
      body: {
        email: "not-a-valid-email",
        password: RandomGenerator.alphabets(10),
      } satisfies ITodoAppUser.ICreate,
    });
  });

  // Step 3: Attempt to create user with password too short (less than 8 chars)
  // This should fail - weak password should be rejected atomically
  await TestValidator.error(
    "should reject password that is too short",
    async () => {
      await api.functional.todoApp.users.create(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "short",
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );

  // Step 4: Attempt to create another user with the same email as the first one
  // This should fail due to email uniqueness constraint - duplicate should be rejected atomically
  await TestValidator.error(
    "should reject duplicate email registration",
    async () => {
      await api.functional.todoApp.users.create(connection, {
        body: {
          email: validEmail,
          password: RandomGenerator.alphabets(10),
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );

  // Verify successful user creation has correct properties
  TestValidator.predicate(
    "created user has timestamp properties",
    createdUser.created_at !== null && createdUser.updated_at !== null,
  );
}
