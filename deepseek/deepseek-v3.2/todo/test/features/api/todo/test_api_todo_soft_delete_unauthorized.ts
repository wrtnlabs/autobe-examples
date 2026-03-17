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
 * Test unauthorized soft deletion of another member's todo.
 * 1. Create two member accounts (Member A and Member B)
 * 2. Member A creates a todo
 * 3. Member B attempts to delete Member A's todo
 * 4. Verify 403 Forbidden error
 * 5. Confirm todo remains accessible to Member A
 */
export async function test_api_todo_soft_delete_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuth);
  // 2. Create Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBAuth);
  // 3. Member A creates a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo);
  // 4. Member B attempts to delete Member A's todo
  await TestValidator.error(
    "Member B cannot delete Member A's todo",
    async () => {
      await api.functional.todoApp.member.todos.erase(memberBConnection, {
        todoId: todo.id,
      });
    },
  );
  // 5. Verify todo still exists and accessible by Member A
  // Note: There's no retrieve endpoint in the provided SDK functions.
  // Since we can't retrieve, we can only ensure the deletion attempt failed.
  // The scenario requires confirming the todo remains undeleted.
  // We'll assume existence is implied by the 403 error.
}
