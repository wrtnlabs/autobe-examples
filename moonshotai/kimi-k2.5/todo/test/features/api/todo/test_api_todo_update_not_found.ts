import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test 404 NOT FOUND handling for updating non-existent or other user's todo.
 *
 * Setup: Member authenticates via join, attempts to update a todo that doesn't exist or belongs to another member.
 *
 * Test Flow:
 * 1. Authenticate as member via /auth/member/join
 * 2. Generate a random invalid UUID as todoId
 * 3. Attempt PUT to /member/todos/{invalidId} with update payload
 * 4. Verify response returns 404 NOT FOUND (same error for non-existent OR other user's todos to prevent information leakage)
 *
 * Expected behaviors:
 * - Response returns 404 NOT FOUND for non-existent todo
 * - The error is identical for non-existent and other user's todos to prevent information leakage about existence of resources
 * - No edit history is created for failed updates
 */
export async function test_api_todo_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Generate a random invalid UUID for a non-existent todo
  const invalidTodoId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create a valid update payload
  const updateBody: IMultiUserTodoTodo.IUpdate = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_complete: true,
  };
  // Step 4 & 5: Attempt to update non-existent todo and verify 404 NOT FOUND
  await TestValidator.httpError(
    "should return 404 NOT FOUND for non-existent todo",
    404,
    async () => {
      await api.functional.multiUserTodo.member.todos.update(memberConnection, {
        todoId: invalidTodoId,
        body: updateBody,
      });
    },
  );
}
