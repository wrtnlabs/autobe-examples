import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { prepare_random_todo_app_todo_edit_history } from "../../../prepare/prepare_random_todo_app_todo_edit_history";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { generate_random_todo_app_todo_user_todos_create } from "../../../generate/generate_random_todo_app_todo_user_todos_create";
import { generate_random_todo_app_todo_user_todos_edit_histories_create } from "../../../generate/generate_random_todo_app_todo_user_todos_edit_histories_create";
import { authorize_todo_user_join } from "../../../authorize/authorize_todo_user_join";
import { authorize_todo_user_login } from "../../../authorize/authorize_todo_user_login";
import { authorize_todo_user_refresh } from "../../../authorize/authorize_todo_user_refresh";
export async function test_api_todo_edit_history_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a todo user to create a todo and edit history
  const todoUserConnection: api.IConnection = { host: connection.host };
  const todoUser = await authorize_todo_user_join(todoUserConnection, {});
  // Step 2: Create a todo that will have its edit history recorded
  const todo = await generate_random_todo_app_todo_user_todos_create(
    todoUserConnection,
    {
      body: {
        title: "Original Todo Title",
        description: "Original description of the todo item",
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      },
    },
  );
  // Step 3: Edit the todo to trigger creation of an edit history entry
  // We'll change the title and description, which should be recorded in the history
  const editHistory =
    await generate_random_todo_app_todo_user_todos_edit_histories_create(
      todoUserConnection,
      {
        body: {
          title: "Updated Todo Title",
          description: "Updated description of the todo item",
        },
        params: {
          todoId: todo.id,
        },
      },
    );
  // Step 4: Verify the edit history was created correctly
  typia.assert(editHistory);
  TestValidator.equals(
    "edit history todo ID matches",
    editHistory.todoId,
    todo.id,
  );
  TestValidator.equals(
    "edit history title matches",
    editHistory.title,
    "Updated Todo Title",
  );
  TestValidator.equals(
    "edit history description matches",
    editHistory.description,
    "Updated description of the todo item",
  );
  TestValidator.predicate("edit history was created recently", () => {
    const now = new Date();
    const createdAt = new Date(editHistory.createdAt);
    const timeDiff = now.getTime() - createdAt.getTime();
    // Allow up to 10 seconds difference
    return timeDiff >= 0 && timeDiff <= 10000;
  });
  TestValidator.equals(
    "edit history user ID matches",
    editHistory.userId,
    todoUser.id,
  );
  // Start date and due date weren't changed, so they should be null in the history
  TestValidator.equals(
    "edit history start date is null",
    editHistory.startDate,
    null,
  );
  TestValidator.equals(
    "edit history due date is null",
    editHistory.dueDate,
    null,
  );
}
