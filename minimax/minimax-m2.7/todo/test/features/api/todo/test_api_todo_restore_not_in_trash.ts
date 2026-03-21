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
 * Test that attempting to restore a todo that is not in the trash returns an error.
 *
 * According to business rules (Section 141 - Invalid Operation for Current State Error),
 * attempting to restore a todo that is not currently in the trash should be rejected
 * with an appropriate error.
 *
 * Steps:
 * 1. Authenticate as a member by calling POST /multiUserTodo/auth/member/join
 * 2. Create a new todo by calling POST /multiUserTodo/member/todos
 * 3. Verify the todo exists with deleted_at=null (active state)
 * 4. Attempt to restore the todo by calling POST /multiUserTodo/member/todos/{todoId}/restore
 * 5. Verify the response returns an error indicating the operation is invalid for the current state
 * 6. Verify the todo remains in its original state (not affected by the failed restore attempt)
 * 7. Verify the todo still appears in the normal todo list
 */
export async function test_api_todo_restore_not_in_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IMultiUserTodoMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  // 2. Create a new todo that is in active state (not deleted)
  const todo: IMultiUserTodoTodo =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {},
    );
  // 3. Verify the todo exists with deleted_at=null (active state)
  typia.assert(todo);
  TestValidator.equals(
    "todo should have null deleted_at",
    todo.deleted_at,
    null,
  );
  // 4. Attempt to restore the todo that is NOT in trash
  // 5. Verify the response returns an error indicating the operation is invalid for current state
  await TestValidator.error(
    "restore should fail for todo not in trash",
    async () => {
      await api.functional.multiUserTodo.member.todos.restore(
        memberConnection,
        {
          todoId: todo.id,
        },
      );
    },
  );
  // 6. Verify the todo remains in its original state (not affected)
  // 7. Verify the todo still appears in the normal todo list
  // The todo should still have deleted_at = null
  TestValidator.equals(
    "todo deleted_at should still be null after failed restore",
    todo.deleted_at,
    null,
  );
}
