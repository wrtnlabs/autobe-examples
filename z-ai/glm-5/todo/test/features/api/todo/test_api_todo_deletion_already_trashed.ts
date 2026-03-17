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

export async function test_api_todo_deletion_already_trashed(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 2: Register and authenticate member
  await authorize_member_join(memberConnection, {});
  // Step 3: Create a todo that will be deleted
  const todo = await generate_random_private_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // Step 4: Delete the todo (soft delete - moves to trash)
  await api.functional.privateTodoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // Step 5: Attempt to delete the same todo again - should fail with 404
  await TestValidator.httpError(
    "already trashed todo deletion",
    404,
    async () => {
      await api.functional.privateTodoApp.member.todos.erase(memberConnection, {
        todoId: todo.id,
      });
    },
  );
}
