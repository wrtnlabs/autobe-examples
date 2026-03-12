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

export async function test_api_todo_delete_nonexistent_returns_404(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test error handling when attempting to delete a non-existent todo item.
   *
   * This test verifies that the system properly returns a 404 Not Found error
   * when attempting to delete a todo that doesn't exist or has already been deleted.
   */
  // 1. Setup: Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Create a todo item to have a valid todoId
  const todo = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. First delete: Soft delete the todo (this should succeed)
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Second delete: Attempt to delete the already-deleted todo (should fail with 404)
  await TestValidator.httpError(
    "delete non-existent todo returns 404",
    404,
    async () =>
      await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
        todoId: todo.id,
      }),
  );
}
