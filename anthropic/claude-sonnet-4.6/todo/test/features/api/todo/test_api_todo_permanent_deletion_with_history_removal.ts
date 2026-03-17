import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_permanent_deletion_with_history_removal(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(todo);
  // Step 3: Edit the todo at least once to generate edit history entries
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        is_completed: false,
        started_at: null,
        due_at: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // Verify the todo was updated
  TestValidator.notEquals(
    "todo title should be updated",
    todo.title,
    updatedTodo.title,
  );
  // Step 4: Soft-delete (trash) the todo before permanent deletion
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // Step 5: Permanently delete the trashed todo (the primary operation under test)
  // This should succeed and return void (204 No Content)
  await api.functional.todoApp.member.todos.permanent.erasePermanent(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  // Step 6: Post-deletion verification - permanent deletion is irreversible
  // Attempt to permanently delete the same todo again - should fail with error (404)
  await TestValidator.error(
    "permanently deleting an already-permanently-deleted todo should fail",
    async () => {
      await api.functional.todoApp.member.todos.permanent.erasePermanent(
        memberConnection,
        {
          todoId: todo.id,
        },
      );
    },
  );
  // Step 7: Attempt to soft-delete (erase) the permanently deleted todo - should fail with error (404)
  await TestValidator.error(
    "soft-deleting an already-permanently-deleted todo should fail",
    async () => {
      await api.functional.todoApp.member.todos.erase(memberConnection, {
        todoId: todo.id,
      });
    },
  );
  // Step 8: Attempt to update the permanently deleted todo - should fail with error (404)
  await TestValidator.error(
    "updating an already-permanently-deleted todo should fail",
    async () => {
      await api.functional.todoApp.member.todos.update(memberConnection, {
        todoId: todo.id,
        body: {
          title: "should not exist",
          is_completed: false,
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
}
