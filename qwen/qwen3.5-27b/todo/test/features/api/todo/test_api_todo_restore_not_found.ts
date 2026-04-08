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

/**
 * Test error handling when attempting to restore a non-existent todo from trash.
 *
 * Validates that the trash restore endpoint properly handles requests for todo items that do not exist in the system. When attempting to restore a todo with a UUID that has never been created, the API should return a 404 Not Found error, indicating the resource could not be located.
 *
 * This test ensures proper error handling for missing resources and validates that the system gracefully handles invalid todo IDs without crashing or returning inappropriate error codes.
 *
 * 1. Authenticate a member account using the join endpoint.
 * 2. Generate a random UUID that does not correspond to any existing todo.
 * 3. Attempt to restore the non-existent todo from trash.
 * 4. Validate that the API returns a 404 Not Found HTTP error.
 */
export async function test_api_todo_restore_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a non-existent todo ID
  const nonExistentTodoId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to restore non-existent todo and validate 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent todo",
    404,
    async () =>
      await api.functional.todoApp.member.trash.restore(memberConnection, {
        todoId: nonExistentTodoId,
      }),
  );
}
