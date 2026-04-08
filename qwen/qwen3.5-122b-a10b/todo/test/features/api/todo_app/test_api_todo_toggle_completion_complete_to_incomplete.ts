import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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

export async function test_api_todo_toggle_completion_complete_to_incomplete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Verify initial state is incomplete
  TestValidator.equals("initial todo is incomplete", todo.is_completed, false);
  // 3. Toggle todo to complete
  const completedTodo =
    await api.functional.todoApp.member.todos.complete.toggle(
      memberConnection,
      {
        todoId: todo.id,
        body: { is_completed: true } satisfies ITodoAppTodo.IToggle,
      },
    );
  typia.assert(completedTodo);
  TestValidator.equals(
    "todo is now complete",
    completedTodo.is_completed,
    true,
  );
  // Record updated_at before second toggle
  const updatedBefore = completedTodo.updated_at;
  // 4. Toggle todo back to incomplete
  const incompleteTodo =
    await api.functional.todoApp.member.todos.complete.toggle(
      memberConnection,
      {
        todoId: todo.id,
        body: { is_completed: false } satisfies ITodoAppTodo.IToggle,
      },
    );
  typia.assert(incompleteTodo);
  // 5. Validate final state
  TestValidator.equals(
    "todo is back to incomplete",
    incompleteTodo.is_completed,
    false,
  );
  TestValidator.notEquals(
    "updated_at changed after toggle",
    incompleteTodo.updated_at,
    updatedBefore,
  );
}
