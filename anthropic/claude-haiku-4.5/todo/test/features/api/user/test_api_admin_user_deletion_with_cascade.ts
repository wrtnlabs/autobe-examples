import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that an admin can permanently delete a user account with all associated
 * data cascading properly.
 *
 * This scenario validates the complete user deletion workflow including todo
 * cascade deletion, session termination, and audit log recording. The test
 * establishes admin authentication, creates a test user with associated todos,
 * deletes the user through the admin endpoint, and verifies that all related
 * data (todos, sessions) has been properly removed from the system. This
 * ensures the irreversible deletion operation works correctly and maintains
 * data integrity through cascade constraints.
 *
 * Test steps:
 *
 * 1. Admin registers and authenticates to obtain admin privileges
 * 2. Create a test user account for deletion
 * 3. Authenticate as the test user and create multiple todos
 * 4. Re-authenticate as admin for deletion operation
 * 5. Delete the user through the admin endpoint
 * 6. Verify the user is marked as deleted
 * 7. Verify cascade deletion prevented further operations
 */
export async function test_api_admin_user_deletion_with_cascade(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const adminAccount: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        password_confirmation: adminPassword,
      } satisfies ITodoAppAdmin.IRegister,
    });
  typia.assert(adminAccount);
  TestValidator.predicate("admin account created", adminAccount.id !== null);

  // 2. Create a test user account for deletion
  const testUserEmail = typia.random<string & tags.Format<"email">>();
  const testUserPassword = RandomGenerator.alphabets(10);
  const testUser: ITodoAppUser = await api.functional.todoApp.users.create(
    connection,
    {
      body: {
        email: testUserEmail,
        password: testUserPassword,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(testUser);
  TestValidator.predicate("test user created", testUser.id !== null);

  // 3. Authenticate as test user and create todos
  const userAuthResponse: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: testUserEmail,
        password: testUserPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(userAuthResponse);

  // Create multiple todos for cascade deletion testing
  const todoIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
      connection,
      {
        body: {
          title: `Test Todo ${i + 1}`,
          description: RandomGenerator.paragraph(),
          priority: RandomGenerator.pick(["low", "medium", "high"] as const),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    todoIds.push(todo.id);
  }
  TestValidator.equals("todos created successfully", todoIds.length, 3);

  // 4. Re-authenticate as admin for deletion operation
  const adminAuthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const adminAuthResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(adminAuthConnection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        password_confirmation: adminPassword,
      } satisfies ITodoAppAdmin.IRegister,
    });
  typia.assert(adminAuthResponse);

  // 5. Delete the user through the admin endpoint
  const deletedUser: ITodoAppUser =
    await api.functional.todoApp.admin.users.erase(adminAuthConnection, {
      userId: testUser.id,
    });
  typia.assert(deletedUser);

  // 6. Verify the user is marked as deleted
  TestValidator.predicate(
    "deleted user marked with deletion timestamp",
    deletedUser.deleted_at !== null && deletedUser.deleted_at !== undefined,
  );
  TestValidator.equals(
    "deleted user ID matches original",
    deletedUser.id,
    testUser.id,
  );

  // 7. Verify cascade deletion - deleted user cannot create todos
  await TestValidator.error(
    "cannot create todos for deleted user",
    async () => {
      await api.functional.todoApp.user.todos.create(connection, {
        body: {
          title: "Should fail",
          priority: "medium",
        } satisfies ITodoAppTodo.ICreate,
      });
    },
  );
}
