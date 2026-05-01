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
 * Test that cross-user soft-delete of a todo is rejected with 403 Forbidden.
 *
 * Validates the ownership isolation rule for the soft-delete operation: a member can only
 * soft-delete their own todos, and any attempt to delete another member's todo must be
 * rejected with an access-denied error.
 *
 * 1. Member A joins and creates a todo, establishing ownership.
 * 2. Member B joins as a separate, unrelated member.
 * 3. Member B attempts to soft-delete Member A's todo using the erase endpoint.
 * 4. The request is rejected, confirming the cross-user isolation enforcement.
 */
export async function test_api_todo_soft_delete_cross_user_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo);
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  await TestValidator.error(
    "cross-user soft-delete should be rejected",
    async () => {
      await api.functional.todoApp.member.todos.erase(memberBConnection, {
        todoId: todo.id,
      });
    },
  );
}
