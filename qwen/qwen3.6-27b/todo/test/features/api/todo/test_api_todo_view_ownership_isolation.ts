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
 * Test todo view ownership isolation by verifying cross-member access is blocked.
 *
 * Validates that a todo created by one member cannot be viewed by a different member,
 * enforcing strict data privacy across user accounts. The system must reject access
 * attempts with a 403 Forbidden HTTP error when the requesting member is not the owner.
 *
 * 1. First member authenticates via join and creates a todo.
 * 2. Second member authenticates via join as a separate account.
 * 3. Second member attempts to retrieve the first member's todo by ID.
 * 4. System rejects with 403 Forbidden, confirming ownership isolation.
 */
export async function test_api_todo_view_ownership_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member (owner) authenticates
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerMember = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerMember);
  // 2. Create a todo under the first member's account
  const todo = await generate_random_todo_app_member_todos_create(
    ownerConnection,
    {},
  );
  typia.assert(todo);
  // 3. Second member (non-owner) authenticates
  const viewerConnection: api.IConnection = { host: connection.host };
  const viewerMember = await authorize_member_join(viewerConnection, {});
  typia.assert(viewerMember);
  // 4. Attempt to retrieve the first member's todo using second member's session
  await TestValidator.httpError("ownership isolation blocks access", 403, () =>
    api.functional.todoApp.member.todos.at(viewerConnection, {
      todoId: todo.id,
    }),
  );
}
