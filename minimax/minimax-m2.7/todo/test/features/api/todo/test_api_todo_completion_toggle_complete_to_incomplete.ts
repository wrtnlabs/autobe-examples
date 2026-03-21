import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_completion_toggle_complete_to_incomplete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // Verify todo starts as incomplete
  TestValidator.equals("todo starts incomplete", todo.completed, false);
  // 3. Toggle to complete first
  const firstToggle = await api.functional.multiUserTodo.member.todos.toggle(
    memberConnection,
    { todoId: todo.id },
  );
  typia.assert(firstToggle);
  // 4. Verify completed=true after first toggle
  TestValidator.equals(
    "todo is complete after first toggle",
    firstToggle.completed,
    true,
  );
  const updatedAtAfterComplete = firstToggle.updated_at;
  // Wait a tiny bit to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 5. Toggle again to mark as incomplete
  const secondToggle = await api.functional.multiUserTodo.member.todos.toggle(
    memberConnection,
    { todoId: todo.id },
  );
  typia.assert(secondToggle);
  // 6. Assert the response returns completed=false and updated_at timestamp is refreshed
  TestValidator.equals(
    "todo is incomplete after second toggle",
    secondToggle.completed,
    false,
  );
  TestValidator.predicate(
    "updated_at is refreshed after toggling to incomplete",
    secondToggle.updated_at > updatedAtAfterComplete,
  );
}
