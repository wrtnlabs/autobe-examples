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
 * Test error handling for invalid trash entry permanent deletion scenarios.
 * 1. Attempt to permanently delete a todo that is not in trash (still active)
 * 2. Attempt to permanently delete a todo with a non-existent trash entry ID
 */
export async function test_api_todo_permanent_deletion_invalid_trash_entry(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Create an active todo (not in trash)
  const activeTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(activeTodo);
  // 3. Create and soft-delete another todo to generate a trash entry
  const todoToDelete =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {},
    );
  typia.assert(todoToDelete);
  // Soft-delete the todo using the permanent delete endpoint (which appears to handle soft deletion)
  const deletedTodo =
    await api.functional.multiUserTodo.member.permanent_delete.erase(
      memberConnection,
      {
        body: {
          search: todoToDelete.id,
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(deletedTodo);
  // 4. Test Case 1: Attempt to permanently delete active todo (not in trash)
  // This should fail since the active todo is not in trash
  await TestValidator.error(
    "cannot delete active todo not in trash",
    async () => {
      await api.functional.multiUserTodo.member.todos.trash_entries.erase(
        memberConnection,
        {
          trashEntryId: activeTodo.id satisfies string & tags.Format<"uuid">,
        },
      );
    },
  );
  // 5. Test Case 2: Attempt to permanently delete with non-existent UUID
  await TestValidator.error(
    "cannot delete non-existent trash entry",
    async () => {
      await api.functional.multiUserTodo.member.todos.trash_entries.erase(
        memberConnection,
        {
          trashEntryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 6. Validate that we cannot use the deleted todo's ID as a trash entry ID
  // The trash entry ID is likely different from the todo ID
  await TestValidator.error(
    "cannot use todo ID as trash entry ID",
    async () => {
      await api.functional.multiUserTodo.member.todos.trash_entries.erase(
        memberConnection,
        {
          trashEntryId: deletedTodo.id satisfies string & tags.Format<"uuid">,
        },
      );
    },
  );
}
