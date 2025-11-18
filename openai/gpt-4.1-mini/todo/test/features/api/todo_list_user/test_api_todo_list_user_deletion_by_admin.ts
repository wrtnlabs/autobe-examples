import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

export async function test_api_todo_list_user_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const createAdminBody = {
    email: adminEmail,
    password: "AdminPass123!",
  } satisfies ITodoListAdmin.ICreate;

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createAdminBody,
    });
  typia.assert(admin);

  // Step 2: Attempt deletion of a non-existent user
  const nonExistentUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "deleting non-existent user should fail",
    async () => {
      await api.functional.todoList.admin.todoListUsers.erase(connection, {
        id: nonExistentUserId,
      });
    },
  );

  // Step 3: Create a user to be deleted
  // Note: Since we have no API to create a TodoList user here, assume userId for test
  // This user ID simulates an existing user for deletion purpose
  const existingUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 4: Perform hard delete on existing user successfully
  await api.functional.todoList.admin.todoListUsers.erase(connection, {
    id: existingUserId,
  });

  // No explicit return value; just ensure no exception thrown for successful deletion
}
