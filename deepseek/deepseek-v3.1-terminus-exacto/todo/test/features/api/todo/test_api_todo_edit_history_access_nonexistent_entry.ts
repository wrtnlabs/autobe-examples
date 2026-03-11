import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistory";
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
 * Test error handling when attempting to access a non-existent edit history entry.
 *
 * 1. Create a member account and authenticate
 * 2. Create a todo item
 * 3. Attempt to retrieve an edit history entry using a valid todo ID but invalid history ID
 * 4. Verify 404 Not Found error response
 */
export async function test_api_todo_edit_history_access_nonexistent_entry(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test-password-123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/todos",
      referrer: "https://example.com",
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Create a todo item
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Attempt to access a non-existent edit history entry
  const nonExistentHistoryId = typia.random<string & tags.Format<"uuid">>();
  // 4. Verify 404 Not Found error
  await TestValidator.httpError(
    "should return 404 for non-existent history entry",
    404,
    async () =>
      await api.functional.multiUserTodo.member.todos.edit_histories.at(
        memberConnection,
        {
          todoId: todo.id,
          historyId: nonExistentHistoryId,
        },
      ),
  );
}
