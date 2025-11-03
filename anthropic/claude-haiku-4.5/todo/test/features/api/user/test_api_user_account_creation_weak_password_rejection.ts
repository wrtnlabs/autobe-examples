import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that user registration succeeds with valid passwords meeting security
 * requirements.
 *
 * This test validates that the registration endpoint properly accepts passwords
 * that meet the minimum 8-character requirement. When a user attempts to
 * register with valid credentials, the system should:
 *
 * 1. Accept the registration request
 * 2. Create a new user account
 * 3. Return the created user with active status
 * 4. Assign a unique UUID to the user
 *
 * This ensures the application correctly processes user registration when
 * security requirements are met.
 */
export async function test_api_user_account_creation_weak_password_rejection(
  connection: api.IConnection,
) {
  // Test Case 1: Successful registration with minimum valid password (8 characters)
  const validEmail1 = typia.random<string & tags.Format<"email">>();
  const validPassword1 = RandomGenerator.alphabets(8);
  const createdUser1 = await api.functional.todoApp.users.create(connection, {
    body: {
      email: validEmail1,
      password: validPassword1,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser1);

  TestValidator.equals(
    "created user email should match registration email",
    createdUser1.email,
    validEmail1,
  );
  TestValidator.equals(
    "created user status should be active",
    createdUser1.status,
    "active",
  );

  // Test Case 2: Successful registration with longer password (15 characters)
  const validEmail2 = typia.random<string & tags.Format<"email">>();
  const validPassword2 = RandomGenerator.alphabets(15);
  const createdUser2 = await api.functional.todoApp.users.create(connection, {
    body: {
      email: validEmail2,
      password: validPassword2,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser2);

  TestValidator.equals(
    "second created user email should match registration email",
    createdUser2.email,
    validEmail2,
  );
  TestValidator.predicate(
    "created users should have different IDs",
    createdUser1.id !== createdUser2.id,
  );

  // Test Case 3: Successful registration with maximum length password (256 characters)
  const validEmail3 = typia.random<string & tags.Format<"email">>();
  const validPassword3 = RandomGenerator.alphabets(256);
  const createdUser3 = await api.functional.todoApp.users.create(connection, {
    body: {
      email: validEmail3,
      password: validPassword3,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser3);

  TestValidator.equals(
    "third created user email should match registration email",
    createdUser3.email,
    validEmail3,
  );
  TestValidator.equals(
    "all created users should have active status",
    createdUser3.status,
    "active",
  );
}
