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

export async function test_api_todo_update_with_date_inconsistency(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  // Step 2: Create a todo item with start_date far in future and due_date as null
  const today = new Date().toISOString();
  const futureDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdTodo: ITodoAppTodo =
    await generate_random_todo_app_user_todos_create(userConnection, {
      body: {
        title: RandomGenerator.name(),
        start_date: futureDate,
        due_date: undefined, // Changed null to undefined to match type '(string & Format<"date-time">) | undefined'
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);
  // Step 3: Update todo item with due_date set before start_date
  const newDueDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday
  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(userConnection, {
      todoId: createdTodo.id,
      body: {
        due_date: newDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);
  // Step 4: Validate that start_date remains unchanged
  TestValidator.equals(
    "start_date unchanged",
    updatedTodo.start_date,
    createdTodo.start_date,
  );
  // Step 5: Validate that due_date was updated to new value
  TestValidator.equals("due_date updated", updatedTodo.due_date, newDueDate);
  // Step 6: Validate that other fields (title, completion_status, etc.) remain unchanged
  TestValidator.equals("title unchanged", updatedTodo.title, createdTodo.title);
  TestValidator.equals(
    "completion_status unchanged",
    updatedTodo.completion_status,
    createdTodo.completion_status,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedTodo.updated_at,
    createdTodo.updated_at,
  );
  // Step 7: Validate that the system accepts date inconsistency (start_date after due_date)
  // Business rule allows this - we verify that no error is thrown and data is accepted
  // This confirms our scenario requirements are met
  // Step 8: Record verification
  // The test verifies that update was accepted and fields were updated as configured
  // While respecting business rule: date inconsistency is allowed but must be recorded in edit history
  // Since edit history isn't directly accessible, we verify field values are persisted
}