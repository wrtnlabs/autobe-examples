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

export async function test_api_todo_completion_toggle_incomplete_to_complete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a new todo with title 'Morning Exercise'
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Morning Exercise",
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Verify the todo's completed field is initially false
  TestValidator.equals(
    "todo should be incomplete initially",
    todo.completed,
    false,
  );
  const initialUpdatedAt = todo.updated_at;
  // 4. Call the toggle endpoint
  const toggledTodo = await api.functional.multiUserTodo.member.todos.toggle(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(toggledTodo);
  // 5. Assert the response returns the todo with completed=true
  TestValidator.equals(
    "todo should be complete after toggle",
    toggledTodo.completed,
    true,
  );
  // 6. Verify the updated_at timestamp has changed
  TestValidator.predicate(
    "updated_at should be different after toggle",
    toggledTodo.updated_at !== initialUpdatedAt,
  );
}
