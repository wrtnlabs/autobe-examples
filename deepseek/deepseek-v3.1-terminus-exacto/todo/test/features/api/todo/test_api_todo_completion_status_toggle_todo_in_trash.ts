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
 * Test business error when attempting to toggle completion status of a todo in trash.
 * 1. Create a new todo
 * 2. Soft-delete it (move to trash)
 * 3. Attempt to toggle completion status - should receive error
 * 4. Validate error response
 */
export async function test_api_todo_completion_status_toggle_todo_in_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate
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
  // 2. Create a todo using utility function
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Store original completion status
  const originalCompletionStatus = todo.is_completed;
  // 3. Soft-delete the todo (move to trash)
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Attempt to toggle completion status - should fail
  await TestValidator.error(
    "cannot toggle completion status of todo in trash",
    async () => {
      await api.functional.multiUserTodo.member.todos.completion_statuses.toggleCompletionStatus(
        memberConnection,
        {
          todoId: todo.id,
          body: {} satisfies IMultiUserTodoTodo.ICompletionStatus,
        },
      );
    },
  );
  // 5. Validate that todo remains in trash with original completion status
  // Note: We cannot directly check the todo's deleted_at or is_completed status
  // without a GET endpoint, but the business rule that trashed todos cannot be
  // modified is validated by the error test above.
  // The error test confirms the business rule enforcement.
}
