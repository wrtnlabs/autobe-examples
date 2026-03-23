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
 * Test that users can only delete their own todos, validating data isolation between members.
 *
 * Setup:
 * 1. Register and authenticate as Member A
 * 2. Member A creates a todo item
 * 3. Register and authenticate as Member B (different account)
 *
 * Test Execution:
 * 1. As Member B, attempt to DELETE a todo that belongs to Member A
 * 2. Verify 403 Forbidden response
 * 3. Verify the todo still exists and is still owned by Member A
 *
 * Expected Behavior:
 * - The system enforces data privacy by preventing cross-user deletions
 * - Each member can only delete their own todos
 * - The todo remains in active state for the original owner
 */
export async function test_api_todo_delete_another_user_fails(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a todo item
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo);
  // 3. Register and authenticate Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 4. As Member B, attempt to delete Member A's todo - should fail with 403
  await TestValidator.httpError(
    "Member B cannot delete Member A's todo",
    403,
    async () =>
      await api.functional.multiUserTodo.member.todos.erase(memberBConnection, {
        todoId: todo.id,
      }),
  );
  // 5. Verify the todo still exists by checking Member A can still access it
  // (We can't directly GET the todo, but we can verify Member A can delete it)
  await api.functional.multiUserTodo.member.todos.erase(memberAConnection, {
    todoId: todo.id,
  });
}
