import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";

export async function test_api_admin_todo_deletion_nonexistent_id(
  connection: api.IConnection,
) {
  // Authenticate as an admin user
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
        role: "admin",
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Generate a non-existent todo ID
  const nonexistentTodoId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Attempt to delete the non-existent todo
  await TestValidator.error(
    "should return 404 for non-existent todo item",
    async () => {
      await api.functional.todoApp.admin.todos.erase(connection, {
        todoId: nonexistentTodoId,
      });
    },
  );
}
