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
 * Test that a member cannot restore another member's todo from trash.
 *
 * This test validates the privacy boundary enforcement where:
 * 1. Member A creates and soft-deletes a todo
 * 2. Member B (different account) attempts to restore Member A's todo
 * 3. The system should reject the request with 404 Not Found
 */
export async function test_api_trash_restore_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A joins and authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Step 2: Member A creates a todo
  const todo = await generate_random_private_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo);
  // Step 3: Member A soft-deletes the todo (moves to trash)
  await api.functional.privateTodoApp.member.todos.erase(memberAConnection, {
    todoId: todo.id,
  });
  // Step 4: Member B joins and authenticates (different account)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Verify Member B is different from Member A
  TestValidator.notEquals("members are different", memberA.id, memberB.id);
  // Step 5: Member B attempts to restore Member A's todo - should fail
  await TestValidator.httpError(
    "Member B cannot restore Member A's todo",
    404,
    async () => {
      await api.functional.privateTodoApp.member.trash.restore(
        memberBConnection,
        {
          todoId: todo.id,
        },
      );
    },
  );
}
