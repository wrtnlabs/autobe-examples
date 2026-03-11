import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoCompletionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoCompletionStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_completion_statuses_create } from "../../../generate/generate_random_multi_user_todo_member_todos_completion_statuses_create";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";
import { prepare_random_multi_user_todo_todo_completion_status } from "../../../prepare/prepare_random_multi_user_todo_todo_completion_status";

/**
 * Test the primary success path of marking a todo as complete.
 *
 * 1. Create a member account using join operation
 * 2. Create a new todo with title only (minimal required fields)
 * 3. Mark the todo as complete via completion status endpoint
 * 4. Validate the response shows updated todo with is_completed: true
 */
export async function test_api_todo_completion_status_toggle_complete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection via join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Create a todo with minimal required fields (title only)
  const todo = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Validate initial state - todos default to incomplete
  TestValidator.equals("new todo is incomplete", todo.is_completed, false);
  // 4. Mark todo as complete via completion status endpoint
  const completedTodo =
    await api.functional.multiUserTodo.member.todos.completion_statuses.create(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          is_completed: true,
        } satisfies IMultiUserTodoTodoCompletionStatus.ICreate,
      },
    );
  typia.assert(completedTodo);
  // 5. Validate completion status change
  TestValidator.equals("todo id unchanged", completedTodo.id, todo.id);
  TestValidator.equals(
    "todo is marked complete",
    completedTodo.is_completed,
    true,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    completedTodo.updated_at,
    todo.updated_at,
  );
  TestValidator.equals(
    "other properties preserved",
    completedTodo.title,
    todo.title,
  );
}
