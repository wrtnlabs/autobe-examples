import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_update_completeness_toggle(
  connection: api.IConnection,
): Promise<void> {
  // Create User A
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_member_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(userA);
  // Create User B
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_member_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(userB);
  // User A creates an incomplete todo
  const todo = await api.functional.todoApp.member.todos.create(
    userAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals("todo initially incomplete", todo.is_complete, false);
  // User A updates the todo title
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    userAConnection,
    {
      todoId: todo.id,
      body: {
        title: "Updated Title " + RandomGenerator.alphabets(5),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  TestValidator.notEquals("title updated", updatedTodo.title, todo.title);
  // User A updates the todo description
  const reUpdatedTodo = await api.functional.todoApp.member.todos.update(
    userAConnection,
    {
      todoId: todo.id,
      body: {
        description:
          "Updated Description " + RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(reUpdatedTodo);
  TestValidator.notEquals(
    "description updated",
    reUpdatedTodo.description,
    todo.description,
  );
  // User B attempts to update User A's todo (should fail)
  await TestValidator.httpError(
    "User B cannot update User A's todo",
    404,
    async () => {
      await api.functional.todoApp.member.todos.update(userBConnection, {
        todoId: todo.id,
        body: { title: "Hacked Title" } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
}
