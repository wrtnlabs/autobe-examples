import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_todo_completion_toggle_from_complete_to_incomplete(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  typia.assert(authorized);
  // 2. Create a todo with all fields
  const createdTodo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(createdTodo);
  // Store original values for comparison
  const originalTitle = createdTodo.title;
  const originalDescription = createdTodo.description;
  const originalStartDate = createdTodo.startDate;
  const originalDueDate = createdTodo.dueDate;
  // Verify newly created todo is incomplete by default
  TestValidator.equals(
    "newly created todo is incomplete",
    createdTodo.isCompleted,
    false,
  );
  // 3. Mark the todo as complete
  const completedTodo = await api.functional.todoApp.user.todos.complete(
    userConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(completedTodo);
  // Verify completion
  TestValidator.equals("todo is now complete", completedTodo.isCompleted, true);
  const completedAt = completedTodo.updatedAt;
  // 4. Mark the completed todo as incomplete
  const incompleteTodo = await api.functional.todoApp.user.todos.incomplete(
    userConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(incompleteTodo);
  // 5. Validate the incomplete operation
  // a) The response returns the todo with is_completed set to false
  TestValidator.equals(
    "todo is now incomplete",
    incompleteTodo.isCompleted,
    false,
  );
  // b) The updated_at timestamp is refreshed and later than the completion timestamp
  TestValidator.predicate(
    "updated_at is refreshed after incomplete",
    incompleteTodo.updatedAt > completedAt,
  );
  // c) The todo still exists and belongs to the user
  TestValidator.equals("todo id unchanged", incompleteTodo.id, createdTodo.id);
  TestValidator.equals(
    "todo belongs to user",
    incompleteTodo.user.id,
    authorized.id,
  );
  // d) All other todo fields remain unchanged
  TestValidator.equals("title unchanged", incompleteTodo.title, originalTitle);
  TestValidator.equals(
    "description unchanged",
    incompleteTodo.description,
    originalDescription,
  );
  TestValidator.equals(
    "start_date unchanged",
    incompleteTodo.startDate,
    originalStartDate,
  );
  TestValidator.equals(
    "due_date unchanged",
    incompleteTodo.dueDate,
    originalDueDate,
  );
  TestValidator.equals("is_deleted unchanged", incompleteTodo.isDeleted, false);
}
