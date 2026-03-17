import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_private_todo_app_member_todos_create } from "../../../generate/generate_random_private_todo_app_member_todos_create";
import { prepare_random_private_todo_app_todo } from "../../../prepare/prepare_random_private_todo_app_todo";

/**
 * Test that a todo in the trash (soft-deleted) cannot be updated.
 *
 * This test validates the business rule that todos moved to trash
 * (soft-deleted with deleted_at timestamp set) cannot be modified
 * through the update API. The system treats soft-deleted todos as
 * non-existent for update operations.
 */
export async function test_api_todo_update_trash_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a todo that will be moved to trash
  const todo = await api.functional.privateTodoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Task to delete",
      } satisfies IPrivateTodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Delete the todo (soft-delete, move to trash)
  await api.functional.privateTodoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Attempt to update the deleted todo - should fail with 404
  await TestValidator.httpError(
    "update deleted todo should fail",
    404,
    async () => {
      await api.functional.privateTodoApp.member.todos.update(
        memberConnection,
        {
          todoId: todo.id,
          body: {
            title: "Trying to update deleted todo",
          } satisfies IPrivateTodoAppTodo.IUpdate,
        },
      );
    },
  );
}
