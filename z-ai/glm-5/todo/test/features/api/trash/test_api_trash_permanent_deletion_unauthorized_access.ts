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
 * Test that a member cannot permanently delete a todo belonging to another member.
 *
 * Prerequisite steps:
 * 1. Register and authenticate as Member A
 * 2. Create a todo as Member A using generate_random_private_todo_app_member_todos_create
 * 3. Delete Member A's todo to move it to trash using api.functional.privateTodoApp.member.todos.erase
 * 4. Register and authenticate as Member B (a different member)
 *
 * Main test execution:
 * 1. As Member B, attempt to call DELETE /privateTodoApp/member/trash/{todoId} using Member A's todoId
 * 2. Verify the response returns 403 Forbidden (access denied)
 *
 * This validates the privacy boundary enforcement ensuring that each member's todos
 * are completely private and inaccessible to other members even when in the trash state.
 */
export async function test_api_trash_permanent_deletion_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // Step 2: Create a todo as Member A
  const todo = await generate_random_private_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo);
  // Step 3: Move Member A's todo to trash (soft delete)
  await api.functional.privateTodoApp.member.todos.erase(memberAConnection, {
    todoId: todo.id,
  });
  // Step 4: Register and authenticate Member B (different member)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Step 5: Member B attempts to permanently delete Member A's todo from trash
  // This should fail with 403 Forbidden (access denied)
  await TestValidator.httpError(
    "Member B cannot permanently delete Member A's todo from trash",
    403,
    async () => {
      await api.functional.privateTodoApp.member.trash.erase(
        memberBConnection,
        {
          todoId: todo.id,
        },
      );
    },
  );
}
