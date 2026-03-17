import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
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

/**
 * Test completion status toggle with completed_at auto-management.
 * Verifies that completed_at timestamp is automatically set when marking complete
 * and cleared when marking incomplete.
 */
export async function test_api_todo_completion_toggle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create incomplete todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // Verify initial state: incomplete, no completion timestamp
  TestValidator.predicate(
    "initial state is incomplete",
    todo.isComplete === false,
  );
  TestValidator.equals("initial completedAt is null", todo.completedAt, null);
  // 3. First Update: Mark as complete (is_complete: true)
  const completedTodo = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        is_complete: true,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(completedTodo);
  // Verify: is_complete true, completedAt should be set
  TestValidator.predicate(
    "isComplete is true after first update",
    completedTodo.isComplete === true,
  );
  TestValidator.predicate(
    "completedAt is set when marked complete",
    completedTodo.completedAt !== null,
  );
  const completedAt = typia.assert<string & tags.Format<"date-time">>(
    completedTodo.completedAt,
  );
  TestValidator.predicate(
    "completedAt is valid ISO datetime",
    !isNaN(Date.parse(completedAt)),
  );
  // 4. Second Update: Mark as incomplete (is_complete: false)
  const incompleteTodo = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        is_complete: false,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(incompleteTodo);
  // Verify: is_complete false, completedAt should be null
  TestValidator.predicate(
    "isComplete is false after second update",
    incompleteTodo.isComplete === false,
  );
  TestValidator.equals(
    "completedAt is null when marked incomplete",
    incompleteTodo.completedAt,
    null,
  );
}