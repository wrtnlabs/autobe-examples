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
 * Test cross-user isolation for todo toggle operation.
 *
 * Validates that a member cannot toggle another member's todo, confirming
 * the absolute privacy boundary between members as specified in the
 * functional requirements. The toggle endpoint must reject requests where
 * the authenticated member does not own the target todo.
 *
 * 1. Member A registers and authenticates via the join utility.
 * 2. Member A creates a todo using the todo generation utility.
 * 3. Member B registers and authenticates via a separate join.
 * 4. Member B attempts to toggle Member A's todo using Member A's todo ID.
 * 5. Validates the response is 403 Forbidden, confirming strict member isolation.
 */
export async function test_api_todo_toggle_cross_user_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers and creates a todo
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo);
  // 2. Member B registers separately
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 3. Member B attempts to toggle Member A's todo - must be forbidden
  await TestValidator.httpError("cross-user toggle denied", 403, () =>
    api.functional.todoApp.member.todos.toggle(memberBConnection, {
      todoId: todo.id,
    }),
  );
}
