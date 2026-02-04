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

export async function test_api_todo_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const authenticatedUser: ITodoAppUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  // Step 2: Create a todo item to update
  const createdTodo: ITodoAppTodo =
    await generate_random_todo_app_user_todos_create(userConnection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 4,
          wordMax: 8,
        }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(), // 24 hours in future
      },
    });
  typia.assert(createdTodo);
  // Step 3: Prepare new values for update
  const newTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const newDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const newStartDate = new Date(Date.now() + 3600000).toISOString(); // 1 hour in future
  const newDueDate = new Date(Date.now() + 172800000).toISOString(); // 48 hours in future
  // Step 4: Update the todo item with new values
  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(userConnection, {
      todoId: createdTodo.id,
      body: {
        title: newTitle,
        description: newDescription,
        start_date: newStartDate,
        due_date: newDueDate,
      },
    });
  typia.assert(updatedTodo);
  // Step 5: Verify that updated_at timestamp was refreshed (newer than created_at)
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedTodo.updated_at) > new Date(createdTodo.updated_at),
  );
  // Step 6: Verify that title was updated successfully to the new value
  TestValidator.equals("title updated correctly", updatedTodo.title, newTitle);
  // Step 7: Verify that description was updated successfully to the new value
  TestValidator.equals(
    "description updated correctly",
    updatedTodo.description,
    newDescription,
  );
  // Step 8: Verify that start_date was updated successfully to the new value
  TestValidator.equals(
    "start_date updated correctly",
    updatedTodo.start_date,
    newStartDate,
  );
  // Step 9: Verify that due_date was updated successfully to the new value
  TestValidator.equals(
    "due_date updated correctly",
    updatedTodo.due_date,
    newDueDate,
  );
  // Step 10: Verify that completion_status was NOT modified
  TestValidator.equals(
    "completion_status unchanged",
    updatedTodo.completion_status,
    createdTodo.completion_status,
  );
  // Step 11: Verify that is_deleted was NOT modified
  TestValidator.equals(
    "is_deleted unchanged",
    updatedTodo.is_deleted,
    createdTodo.is_deleted,
  );
}
