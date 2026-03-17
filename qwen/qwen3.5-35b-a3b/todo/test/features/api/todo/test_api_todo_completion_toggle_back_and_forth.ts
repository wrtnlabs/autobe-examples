import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_app_member_todos_create } from "../../../generate/generate_random_multi_user_todo_app_member_todos_create";
import { prepare_random_multi_user_todo_app_todo } from "../../../prepare/prepare_random_multi_user_todo_app_todo";

export async function test_api_todo_completion_toggle_back_and_forth(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      href: "http://test.com/join",
      referrer: "http://test.com",
      ip: "127.0.0.1",
    },
  });
  typia.assert(member);
  // 2. Create new member connection with token for todo operations
  const todoConnection: api.IConnection = { host: connection.host };
  todoConnection.headers = { Authorization: `Bearer ${member.token.access}` };
  // 3. Create a todo item
  const todo = await api.functional.multiUserTodoApp.member.todos.create(
    todoConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(todo);
  // 4. Verify initial state (should be incomplete)
  TestValidator.equals(
    "initial completion status is false",
    todo.isCompleted,
    false,
  );
  let previousUpdatedAt = new Date(todo.updatedAt);
  // 5. Toggle 1: incomplete → complete
  let toggledTodo = await api.functional.multiUserTodoApp.member.todos.complete(
    todoConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(toggledTodo);
  TestValidator.equals(
    "toggle 1: completed status is true",
    toggledTodo.isCompleted,
    true,
  );
  TestValidator.predicate(
    "toggle 1: updatedAt changed",
    () => new Date(toggledTodo.updatedAt) > previousUpdatedAt,
  );
  previousUpdatedAt = new Date(toggledTodo.updatedAt);
  // 6. Toggle 2: complete → incomplete
  toggledTodo = await api.functional.multiUserTodoApp.member.todos.complete(
    todoConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(toggledTodo);
  TestValidator.equals(
    "toggle 2: completed status is false",
    toggledTodo.isCompleted,
    false,
  );
  TestValidator.predicate(
    "toggle 2: updatedAt changed",
    () => new Date(toggledTodo.updatedAt) > previousUpdatedAt,
  );
  previousUpdatedAt = new Date(toggledTodo.updatedAt);
  // 7. Toggle 3: incomplete → complete
  toggledTodo = await api.functional.multiUserTodoApp.member.todos.complete(
    todoConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(toggledTodo);
  TestValidator.equals(
    "toggle 3: completed status is true",
    toggledTodo.isCompleted,
    true,
  );
  TestValidator.predicate(
    "toggle 3: updatedAt changed",
    () => new Date(toggledTodo.updatedAt) > previousUpdatedAt,
  );
}
