import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_multi_user_todo_user_todos_create } from "../../../generate/generate_random_multi_user_todo_user_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_update_all_fields_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authorize user login
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody: IMultiUserTodoUser.IJoin = {
    email: `${RandomGenerator.alphabets(10)}@example.com`,
    password: `Passw0rd!${RandomGenerator.alphabets(5)}`,
    display_name: RandomGenerator.name(2),
  } satisfies IMultiUserTodoUser.IJoin;
  // Use utility function to join and get authorization tokens
  const authorized = await authorize_user_join(connection, { body: joinBody });
  // Assign token to new userConnection for authenticated requests
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a todo for the authorized user using generation utility
  const rawOriginalTodo = await generate_random_multi_user_todo_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(), // +1 day
      },
    },
  );
  const originalTodo = typia.assert(rawOriginalTodo) as (IMultiUserTodoTodo & {
    id: string;
    title: string;
    description: string;
    start_date: string;
    due_date: string;
    completed: boolean;
    updated_at: string;
  });
  // 3. Prepare update data with all fields changed
  const updatedTitle = RandomGenerator.paragraph({ sentences: 1 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedStartDate = new Date(Date.now() + 3600000).toISOString(); // +1 hour
  const updatedDueDate = new Date(Date.now() + 172800000).toISOString(); // +2 days
  const updatedCompleted = !originalTodo.completed;
  const updateBody: IMultiUserTodoTodo.IUpdate = {
    title: updatedTitle,
    description: updatedDescription,
    start_date: updatedStartDate,
    due_date: updatedDueDate,
    completed: updatedCompleted,
  } satisfies IMultiUserTodoTodo.IUpdate;
  // 4. Call the update endpoint
  const rawUpdatedTodo = await api.functional.multiUserTodo.user.todos.update(
    userConnection,
    {
      todoId: originalTodo.id,
      body: updateBody,
    },
  );
  const updatedTodo = typia.assert(rawUpdatedTodo) as (IMultiUserTodoTodo & {
    id: string;
    title: string;
    description: string;
    start_date: string;
    due_date: string;
    completed: boolean;
    updated_at: string;
  });
  // 5. Validate updated fields are reflected correctly
  TestValidator.equals("title updated", updatedTodo.title, updatedTitle);
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    updatedDescription,
  );
  TestValidator.equals(
    "start_date updated",
    updatedTodo.start_date,
    updatedStartDate,
  );
  TestValidator.equals(
    "due_date updated",
    updatedTodo.due_date,
    updatedDueDate,
  );
  TestValidator.equals(
    "completed status updated",
    updatedTodo.completed,
    updatedCompleted,
  );
  TestValidator.equals("id unchanged", updatedTodo.id, originalTodo.id);
  // 6. Check that edit history entry is created and reflects the changes
  // As there's no direct API for edit history in given info, we rely on the contract that update creates history
  // So ensure that updatedTodo timestamps reflect change
  // updated_at should be later than original updated_at
  if (new Date(updatedTodo.updated_at) <= new Date(originalTodo.updated_at)) {
    throw new Error("updated_at timestamp was not updated after modification");
  }
}
