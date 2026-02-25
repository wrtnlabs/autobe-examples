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

export async function test_api_todo_update_ownership_and_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create two users
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(user1);
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(user2);
  // Step 2: Create todos for both users
  const user1Todo = await generate_random_todo_app_user_todos_create(
    user1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(user1Todo);
  const user2Todo = await generate_random_todo_app_user_todos_create(
    user2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(user2Todo);
  // Step 3: Test user isolation - user1 trying to update user2's todo should fail
  await TestValidator.error(
    "user isolation - cannot update another user's todo",
    async () => {
      await api.functional.todoApp.user.todos.update(user1Connection, {
        todoId: user2Todo.id,
        body: {
          title: "Unauthorized update attempt",
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
  // Step 4: Soft delete a todo to test forbidden updates
  await api.functional.todoApp.user.todos.erase(user1Connection, {
    todoId: user1Todo.id,
  });
  // Step 5: Test updating soft-deleted todo should fail
  await TestValidator.error(
    "soft-deleted todo - cannot update deleted todo",
    async () => {
      await api.functional.todoApp.user.todos.update(user1Connection, {
        todoId: user1Todo.id,
        body: {
          title: "Update after deletion attempt",
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
  // Step 6: Test updating with non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent UUID - cannot update non-existent todo",
    async () => {
      await api.functional.todoApp.user.todos.update(user1Connection, {
        todoId: nonExistentId,
        body: {
          title: "Update non-existent todo",
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
  // Step 7: Test validation rules - empty title (if title field provided)
  const validUser2Todo = await generate_random_todo_app_user_todos_create(
    user2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(validUser2Todo);
  await TestValidator.error(
    "validation - empty title should fail",
    async () => {
      await api.functional.todoApp.user.todos.update(user2Connection, {
        todoId: validUser2Todo.id,
        body: {
          title: "", // Empty title should fail validation
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
  // Step 8: Test successful update with valid data
  const updatedTitle = "Successfully updated todo";
  const successfulUpdate = await api.functional.todoApp.user.todos.update(
    user2Connection,
    {
      todoId: validUser2Todo.id,
      body: {
        title: updatedTitle,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(successfulUpdate);
  TestValidator.equals(
    "successful update - title should match",
    successfulUpdate.title,
    updatedTitle,
  );
}
