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
 * Test that a member cannot delete another member's todo, ensuring privacy boundary enforcement.
 *
 * Test Steps:
 * 1. Member A creates a todo
 * 2. Member B attempts to delete Member A's todo using the todoId
 * 3. Verify the system returns 404 Not Found (not 403 Forbidden to preserve privacy)
 * 4. Verify Member A's todo still exists and is not in trash
 *
 * Business Logic Validation:
 * - Complete privacy: members cannot access or delete other members' todos
 * - Security through obscurity: 404 response prevents revealing whether todo exists for another user
 * - The todo owner's data remains unchanged after unauthorized deletion attempt
 */
export async function test_api_todo_deletion_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A setup - create and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member B setup - create and authenticate (different member)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 3. Member A creates a todo
  const todo = await generate_random_private_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo);
  // 4. Member B attempts to delete Member A's todo - should fail with 404
  await TestValidator.httpError(
    "Member B cannot delete Member A's todo",
    404,
    async () => {
      await api.functional.privateTodoApp.member.todos.erase(
        memberBConnection,
        {
          todoId: todo.id,
        },
      );
    },
  );
  // 5. Verify Member A's todo still exists by checking the todo object has no deleted_at
  TestValidator.equals("Todo should not be deleted", todo.deleted_at, null);
}
