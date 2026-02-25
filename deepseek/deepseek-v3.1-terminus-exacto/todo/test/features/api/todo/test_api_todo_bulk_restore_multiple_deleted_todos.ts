import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_bulk_restore_multiple_deleted_todos(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test bulk restoration of multiple deleted todos with atomic transaction behavior.
   * 1. Create authenticated user connection
   * 2. Create 3-6 todos with varying attributes
   * 3. Soft delete all todos to move them to trash
   * 4. Execute bulk restore operation with todo IDs
   * 5. Verify atomic restoration behavior and data integrity
   */
  // 1. Create authenticated user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorized);
  // 2. Create multiple todos with varying titles
  const todoCount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<3> & tags.Maximum<6>
  >();
  const todos: ITodoAppTodo[] = [];
  for (let i = 0; i < todoCount; i++) {
    const todo = await generate_random_todo_app_user_todos_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 5,
          }),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    todos.push(todo);
  }
  // 3. Soft delete all todos
  for (const todo of todos) {
    await api.functional.todoApp.user.todos.erase(userConnection, {
      todoId: todo.id,
    });
  }
  // 4. Execute bulk restore
  const bulkRestoreResponse =
    await api.functional.todoApp.user.bulk_restore.bulkRestore(userConnection, {
      body: {
        todoIds: todos.map((todo) => todo.id),
      } satisfies ITodoAppTodo.IBulkRestoreRequest,
    });
  typia.assert(bulkRestoreResponse);
  // 5. Validate response
  TestValidator.equals(
    "restored todo count matches",
    bulkRestoreResponse.data.length,
    todoCount,
  );
  TestValidator.predicate(
    "pagination info present",
    bulkRestoreResponse.pagination.records >= todoCount,
  );
  // 6. Verify restored todos retain original attributes
  for (const originalTodo of todos) {
    const restoredTodo = bulkRestoreResponse.data.find(
      (t) => t.id === originalTodo.id,
    );
    TestValidator.predicate(
      `todo ${originalTodo.id} should be restored`,
      restoredTodo !== undefined,
    );
    if (restoredTodo) {
      TestValidator.equals(
        `title should match for todo ${originalTodo.id}`,
        restoredTodo.title,
        originalTodo.title,
      );
      TestValidator.predicate(
        `deleted_at should be null for todo ${originalTodo.id}`,
        restoredTodo.deleted_at === null,
      );
    }
  }
  // 7. Verify atomic behavior by attempting invalid restoration
  const fakeTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("should reject non-existent todo IDs", async () => {
    await api.functional.todoApp.user.bulk_restore.bulkRestore(userConnection, {
      body: {
        todoIds: [...todos.map((todo) => todo.id), fakeTodoId],
      } satisfies ITodoAppTodo.IBulkRestoreRequest,
    });
  });
  // Atomic behavior validation completed with error testing
}
