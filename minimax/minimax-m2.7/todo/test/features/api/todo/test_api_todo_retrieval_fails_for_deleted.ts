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

/**
 * Test that a member cannot retrieve their own soft-deleted todo - trash isolation.
 *
 * Validates that soft-deleted todos (deleted_at IS NOT NULL) are not accessible via
 * the standard retrieval endpoint. This confirms the query correctly filters out
 * deleted todos using WHERE deleted_at IS NULL.
 *
 * Steps:
 * 1. Register a member via POST /multiUserTodo/auth/member/join
 * 2. Create a todo via POST /multiUserTodo/member/todos
 * 3. Soft delete the todo via DELETE /multiUserTodo/member/todos/{todoId}
 * 4. Attempt to retrieve the deleted todo via GET /multiUserTodo/member/todos/{todoId}
 *
 * Expected: Response should be HTTP 404
 */
export async function test_api_todo_retrieval_fails_for_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3. Soft delete the todo (move to trash)
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Attempt to retrieve the deleted todo - should fail with 404
  await TestValidator.httpError(
    "soft-deleted todo should not be retrievable",
    404,
    async () =>
      await api.functional.multiUserTodo.member.todos.at(memberConnection, {
        todoId: todo.id,
      }),
  );
}
