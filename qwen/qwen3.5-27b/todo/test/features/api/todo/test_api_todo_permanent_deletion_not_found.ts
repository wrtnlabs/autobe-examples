import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that permanent deletion fails when the todo does not exist.
 *
 * Validates that attempting to permanently delete a non-existent todo from trash returns a 404 error. This test ensures proper error handling when users try to delete todos that either never existed or have already been permanently removed.
 *
 * 1. Authenticate as a member to access private todo operations.
 * 2. Generate a random UUID that does not correspond to any existing todo.
 * 3. Attempt to permanently delete the non-existent todo from trash.
 * 4. Verify that the system returns a 404 HTTP error indicating the todo was not found.
 */
export async function test_api_todo_permanent_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Generate a non-existent todo ID
  const nonExistentTodoId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to permanently delete non-existent todo and verify 404 error
  await TestValidator.httpError(
    "permanent deletion of non-existent todo returns 404",
    404,
    async () =>
      await api.functional.todoApp.member.trash.erase(memberConnection, {
        todoId: nonExistentTodoId,
      }),
  );
}
