import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

/**
 * Test soft-delete of a todo item for the authenticated member.
 *
 * Validates that a member can successfully soft-delete their own todo. The todo is moved to the trash via the erase endpoint, which sets the `deleted_at` timestamp server-side. A successful call (no error thrown) confirms the soft-delete operation completed.
 *
 * The test follows the natural flow: member registration and authentication, todo creation, then soft-deletion using the created todo's ID.
 *
 * 1. Member joins and authenticates via `authorize_member_join`.
 * 2. A random todo is created via `generate_random_todo_app_member_todos_create`.
 * 3. The todo is soft-deleted by calling `erase` with its UUID.
 */
export async function test_api_todo_soft_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3. Soft-delete the todo
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
}
