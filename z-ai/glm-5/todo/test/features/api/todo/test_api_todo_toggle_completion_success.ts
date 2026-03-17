import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_private_todo_app_member_todos_create } from "../../../generate/generate_random_private_todo_app_member_todos_create";
import { prepare_random_private_todo_app_todo } from "../../../prepare/prepare_random_private_todo_app_todo";

export async function test_api_todo_toggle_completion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new todo
  const todo = await generate_random_private_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
      },
    },
  );
  typia.assert(todo);
  // Store initial values for comparison
  const initialUpdatedAt = todo.updated_at;
  // Verify initial state - new todos should be incomplete
  TestValidator.equals(
    "initial completed should be false",
    todo.completed,
    false,
  );
  // 3. First toggle - should change to completed
  const toggledTodo = await api.functional.privateTodoApp.member.todos.toggle(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(toggledTodo);
  // 4. Verify first toggle results
  TestValidator.equals(
    "completed should be true after first toggle",
    toggledTodo.completed,
    true,
  );
  TestValidator.predicate(
    "updated_at should be refreshed after first toggle",
    new Date(toggledTodo.updated_at).getTime() >=
      new Date(initialUpdatedAt).getTime(),
  );
  TestValidator.equals("id should remain unchanged", toggledTodo.id, todo.id);
  TestValidator.equals(
    "title should remain unchanged",
    toggledTodo.title,
    todo.title,
  );
  TestValidator.equals(
    "description should remain unchanged",
    toggledTodo.description,
    todo.description,
  );
  TestValidator.equals(
    "start_date should remain unchanged",
    toggledTodo.start_date,
    todo.start_date,
  );
  TestValidator.equals(
    "due_date should remain unchanged",
    toggledTodo.due_date,
    todo.due_date,
  );
  TestValidator.equals(
    "member id should remain unchanged",
    toggledTodo.member.id,
    todo.member.id,
  );
  // Store updated_at after first toggle
  const afterFirstToggleUpdatedAt = toggledTodo.updated_at;
  // 5. Second toggle - should change back to incomplete
  const toggledBackTodo =
    await api.functional.privateTodoApp.member.todos.toggle(memberConnection, {
      todoId: todo.id,
    });
  typia.assert(toggledBackTodo);
  // 6. Verify second toggle results
  TestValidator.equals(
    "completed should be false after second toggle",
    toggledBackTodo.completed,
    false,
  );
  TestValidator.predicate(
    "updated_at should be refreshed after second toggle",
    new Date(toggledBackTodo.updated_at).getTime() >=
      new Date(afterFirstToggleUpdatedAt).getTime(),
  );
  TestValidator.equals(
    "id should remain unchanged after second toggle",
    toggledBackTodo.id,
    todo.id,
  );
  TestValidator.equals(
    "title should remain unchanged after second toggle",
    toggledBackTodo.title,
    todo.title,
  );
}
