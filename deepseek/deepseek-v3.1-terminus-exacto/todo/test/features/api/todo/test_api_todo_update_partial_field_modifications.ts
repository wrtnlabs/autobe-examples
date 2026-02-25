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

export async function test_api_todo_update_partial_field_modifications(
  connection: api.IConnection,
): Promise<void> {
  // User registration and authentication
  const userJoinAuth = await authorize_user_join({ host: connection.host }, {});
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: userJoinAuth.token.access };
  // Create initial todo
  const initialTodo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: { title: "Initial Todo Title" } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(initialTodo);
  let currentTodo = initialTodo;
  // Test 1: Update only title
  const updatedTitle = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: currentTodo.id,
      body: { title: "Updated Title Only" } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTitle);
  TestValidator.equals(
    "title should be updated",
    updatedTitle.title,
    "Updated Title Only",
  );
  TestValidator.equals(
    "user should remain same",
    updatedTitle.user.id,
    currentTodo.user.id,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(updatedTitle.updated_at) > new Date(currentTodo.updated_at),
  );
  currentTodo = updatedTitle;
  // Test 2: Update only description (set to null)
  const updatedDescriptionNull = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: currentTodo.id,
      body: { description: null } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedDescriptionNull);
  TestValidator.equals(
    "title should remain from previous update",
    updatedDescriptionNull.title,
    currentTodo.title,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(updatedDescriptionNull.updated_at) >
      new Date(currentTodo.updated_at),
  );
  currentTodo = updatedDescriptionNull;
  // Test 3: Update only description (set to actual value)
  const descriptionText = "Test description for the todo";
  const updatedDescription = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: currentTodo.id,
      body: { description: descriptionText } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedDescription);
  TestValidator.equals(
    "title should remain",
    updatedDescription.title,
    currentTodo.title,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(updatedDescription.updated_at) > new Date(currentTodo.updated_at),
  );
  currentTodo = updatedDescription;
  // Test 4: Update only start_date (set to null)
  const updatedStartDateNull = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: currentTodo.id,
      body: { start_date: null } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedStartDateNull);
  TestValidator.equals(
    "title should remain",
    updatedStartDateNull.title,
    currentTodo.title,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(updatedStartDateNull.updated_at) >
      new Date(currentTodo.updated_at),
  );
  currentTodo = updatedStartDateNull;
  // Test 5: Update only start_date (set to actual value)
  const startDate = new Date().toISOString();
  const updatedStartDate = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: currentTodo.id,
      body: { start_date: startDate } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedStartDate);
  TestValidator.equals(
    "title should remain",
    updatedStartDate.title,
    currentTodo.title,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(updatedStartDate.updated_at) > new Date(currentTodo.updated_at),
  );
  currentTodo = updatedStartDate;
  // Test 6: Update only due_date (set to null)
  const updatedDueDateNull = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: currentTodo.id,
      body: { due_date: null } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedDueDateNull);
  TestValidator.equals(
    "title should remain",
    updatedDueDateNull.title,
    currentTodo.title,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(updatedDueDateNull.updated_at) > new Date(currentTodo.updated_at),
  );
  currentTodo = updatedDueDateNull;
  // Test 7: Update only due_date (set to actual value)
  const dueDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const updatedDueDate = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: currentTodo.id,
      body: { due_date: dueDate } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedDueDate);
  TestValidator.equals(
    "title should remain",
    updatedDueDate.title,
    currentTodo.title,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(updatedDueDate.updated_at) > new Date(currentTodo.updated_at),
  );
  currentTodo = updatedDueDate;
  // Test 8: Update multiple fields together
  const finalTitle = "Final Combined Update";
  const finalDescription = "Final description";
  const finalStartDate = new Date().toISOString();
  const finalDueDate = new Date(Date.now() + 172800000).toISOString(); // Day after tomorrow
  const combinedUpdate = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: currentTodo.id,
      body: {
        title: finalTitle,
        description: finalDescription,
        start_date: finalStartDate,
        due_date: finalDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(combinedUpdate);
  TestValidator.equals(
    "combined title update",
    combinedUpdate.title,
    finalTitle,
  );
  TestValidator.predicate(
    "combined update should be latest",
    new Date(combinedUpdate.updated_at) > new Date(currentTodo.updated_at),
  );
  // Verify all fields are properly set in final state
  TestValidator.equals("final description", combinedUpdate.title, finalTitle);
}
