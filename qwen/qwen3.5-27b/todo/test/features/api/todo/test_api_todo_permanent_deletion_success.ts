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
 * Test successful permanent deletion of a todo from trash.
 *
 * This test verifies the complete workflow of permanently deleting a todo:
 * 1. Authenticate as member user
 * 2. Create a todo item
 * 3. Soft delete the todo (move to trash)
 * 4. Permanently delete from trash
 * 5. Verify deletion is irreversible
 */
export async function test_api_todo_permanent_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a todo item
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3. Soft delete the todo (move to trash)
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Permanently delete the todo from trash
  await api.functional.multiUserTodo.member.trash.erase(memberConnection, {
    todoId: todo.id,
  });
  // 5. Verify the deletion is irreversible
  // Attempting to permanently delete again should fail (todo no longer exists)
  await TestValidator.error(
    "permanently deleted todo cannot be deleted again",
    async () =>
      await api.functional.multiUserTodo.member.trash.erase(memberConnection, {
        todoId: todo.id,
      }),
  );
}
